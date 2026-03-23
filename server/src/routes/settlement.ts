import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIo } from '../io';

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

    res.json(settlement);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/shares/:userId/confirm', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;

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
    }

    const updated = await getFullSettlement(id);
    const io = getIo();
    io.to(settlement.roomId).emit('settlement:updated', updated);

    res.json(updated);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
