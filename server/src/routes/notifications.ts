import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications - Get current user's notifications
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Keep last 50 notifications
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: '알림 목록을 불러오지 못했습니다.' });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: '알림 상태를 변경하지 못했습니다.' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: '알림 상태를 변경하지 못했습니다.' });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: '알림을 삭제하지 못했습니다.' });
  }
});

export default router;
