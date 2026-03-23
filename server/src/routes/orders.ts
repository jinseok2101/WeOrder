import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIo } from '../io';
import { calcOrderTotals } from '../services/roomService';

const router = Router();

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, price, quantity, options } = req.body;
    const userId = req.userId!;

    const existing = await prisma.orderItem.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '주문 항목을 찾을 수 없습니다.' });
    if (existing.userId !== userId) return res.status(403).json({ message: '본인 주문만 수정할 수 있습니다.' });

    const item = await prisma.orderItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: Number(price) }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(options !== undefined && { options }),
      },
      include: { user: { select: { id: true, nickname: true } } },
    });

    const allItems = await prisma.orderItem.findMany({ where: { roomId: existing.roomId } });
    const room = await prisma.room.findUnique({
      where: { id: existing.roomId },
      select: { minimumOrder: true, deliveryFee: true },
    });
    const totals = calcOrderTotals(allItems, room?.minimumOrder || 0, room?.deliveryFee || 0);

    const io = getIo();
    io.to(existing.roomId).emit('order:item_updated', { item, totals });

    res.json({ item, totals });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.orderItem.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '주문 항목을 찾을 수 없습니다.' });
    if (existing.userId !== userId) return res.status(403).json({ message: '본인 주문만 삭제할 수 있습니다.' });

    await prisma.orderItem.delete({ where: { id } });

    const allItems = await prisma.orderItem.findMany({ where: { roomId: existing.roomId } });
    const room = await prisma.room.findUnique({
      where: { id: existing.roomId },
      select: { minimumOrder: true, deliveryFee: true },
    });
    const totals = calcOrderTotals(allItems, room?.minimumOrder || 0, room?.deliveryFee || 0);

    const io = getIo();
    io.to(existing.roomId).emit('order:item_deleted', { itemId: id, totals });

    res.json({ message: '삭제되었습니다.', totals });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
