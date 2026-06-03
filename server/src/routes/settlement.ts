import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIo } from '../io';
import { notificationService } from '../services/notificationService';
import { roomDetailInclude } from './rooms';

const router = Router();

async function getFullSettlement(settlementId: string) {
  return prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      shares: {
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { totalAmount: 'desc' },
      },
    },
  });
}

router.patch('/:id/shares/:userId/paid', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;

    if (req.userId !== userId) {
      return res.status(403).json({ message: '본인 정산만 처리할 수 있습니다.' });
    }

    const share = await prisma.settlementShare.findUnique({
      where: { settlementId_userId: { settlementId: id, userId } },
    });
    if (!share) return res.status(404).json({ message: '정산 항목을 찾을 수 없습니다.' });

    await prisma.settlementShare.update({
      where: { settlementId_userId: { settlementId: id, userId } },
      data: { status: 'PAID', paidAt: new Date() },
    });

    const settlement = await getFullSettlement(id);
    const io = getIo();
    io.to(settlement!.roomId).emit('settlement:updated', settlement);

    // 방장에게 송금 완료 푸시 알림 발송 (비동기 수행)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true }
    });
    const room = await prisma.room.findUnique({
      where: { id: settlement!.roomId },
      select: { hostId: true, restaurantName: true }
    });

    if (room) {
      notificationService.sendPushNotification(
        [room.hostId],
        {
          title: `💸 입금 완료 알림`,
          body: `${user?.nickname || '이웃'}님이 '${room.restaurantName}' 배달비 송금을 완료하셨습니다.`,
          data: { roomId: settlement!.roomId, type: 'settlement' }
        },
        'settlement'
      );
    }

    res.json(settlement);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/shares/:userId/confirm', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;
    const io = getIo();

    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!settlement) return res.status(404).json({ message: '정산 정보를 찾을 수 없습니다.' });
    if (settlement.room.hostId !== req.userId) {
      return res.status(403).json({ message: '방장만 납부를 확인할 수 있습니다.' });
    }

    await prisma.settlementShare.update({
      where: { settlementId_userId: { settlementId: id, userId } },
      data: { status: 'CONFIRMED' },
    });

    const allShares = await prisma.settlementShare.findMany({ where: { settlementId: id } });
    const allConfirmed = allShares.every((s) => s.status === 'CONFIRMED');

    if (allConfirmed) {
      await prisma.settlement.update({ where: { id }, data: { status: 'COMPLETED' } });
      await prisma.room.update({ where: { id: settlement.roomId }, data: { status: 'SETTLED' } });
      
      const updatedRoom = await prisma.room.findUnique({
        where: { id: settlement.roomId },
        include: roomDetailInclude(),
      });
      if (updatedRoom) {
        io.to(settlement.roomId).emit('room:updated', updatedRoom);
      }
    }

    const updated = await getFullSettlement(id);
    io.to(settlement.roomId).emit('settlement:updated', updated);

    // 입금 확인 완료 알림 발송 (송금한 멤버에게)
    notificationService.sendPushNotification(
      [userId],
      {
        title: `✅ WeOrder 입금 확인 완료`,
        body: `'${settlement.room.restaurantName}' 방장님이 송금 입금을 확인했습니다!`,
        data: { roomId: settlement.roomId, type: 'settlement' }
      },
      'settlement'
    );

    // 전체 정산 완료 시 방장에게 알림 발송
    if (allConfirmed) {
      notificationService.sendPushNotification(
        [settlement.room.hostId],
        {
          title: `정산 최종 완료!`,
          body: `'${settlement.room.restaurantName}' 방의 모든 멤버가 송금을 완료하여 정산이 성공적으로 끝났습니다!`,
          data: { roomId: settlement.roomId, type: 'settlement' }
        },
        'settlement'
      );
    }

    res.json(updated);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
