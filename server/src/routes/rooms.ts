import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIo } from '../io';
import { haversineDistance, calcOrderTotals } from '../services/roomService';
import { createSettlement } from '../services/settlementService';

const router = Router();

function roomDetailInclude() {
  return {
    host: { select: { id: true, nickname: true } },
    members: {
      include: { user: { select: { id: true, nickname: true } } },
      orderBy: { joinedAt: 'asc' as const },
    },
    orderItems: {
      include: { user: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'asc' as const },
    },
    settlement: {
      include: {
        shares: {
          include: { user: { select: { id: true, nickname: true } } },
          orderBy: { totalAmount: 'desc' as const },
        },
      },
    },
  };
}

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 2.0;

    const rooms = await prisma.room.findMany({
      where: {
        status: { in: ['OPEN', 'ORDERING'] },
        deadline: { gt: new Date() },
      },
      include: {
        host: { select: { id: true, nickname: true } },
        members: true,
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = rooms
      .filter((room) => {
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return true;
        return haversineDistance(lat, lng, room.latitude, room.longitude) <= radius;
      })
      .map((room) => {
        const distance =
          lat && lng && !isNaN(lat) && !isNaN(lng)
            ? Math.round(haversineDistance(lat, lng, room.latitude, room.longitude) * 100) / 100
            : null;
        const totals = calcOrderTotals(room.orderItems, room.minimumOrder, room.deliveryFee);
        return {
          id: room.id,
          title: room.title,
          restaurantName: room.restaurantName,
          restaurantUrl: room.restaurantUrl,
          status: room.status,
          host: room.host,
          hostId: room.hostId,
          maxMembers: room.maxMembers,
          radiusKm: room.radiusKm,
          latitude: room.latitude,
          longitude: room.longitude,
          deadline: room.deadline,
          createdAt: room.createdAt,
          memberCount: room.members.length,
          distance,
          ...totals,
        };
      });

    res.json(result);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/mine', authenticate, async (req: AuthRequest, res) => {
  try {
    const memberships = await prisma.roomMember.findMany({
      where: { userId: req.userId },
      include: {
        room: {
          include: {
            host: { select: { id: true, nickname: true } },
            members: true,
            settlement: { include: { shares: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    res.json(memberships.map((m) => m.room));
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      restaurantName,
      restaurantUrl,
      maxMembers,
      deliveryFee,
      minimumOrder,
      radiusKm,
      latitude,
      longitude,
      deadline,
    } = req.body;

    if (!title || !restaurantName || !deliveryFee || !minimumOrder || !latitude || !longitude || !deadline) {
      return res.status(400).json({ message: '필수 항목을 모두 입력해주세요.' });
    }

    const room = await prisma.room.create({
      data: {
        title,
        restaurantName,
        restaurantUrl,
        maxMembers: maxMembers || 4,
        deliveryFee: Number(deliveryFee),
        minimumOrder: Number(minimumOrder),
        radiusKm: radiusKm || 1.0,
        latitude: Number(latitude),
        longitude: Number(longitude),
        deadline: new Date(deadline),
        hostId: req.userId!,
      },
    });

    await prisma.roomMember.create({
      data: { roomId: room.id, userId: req.userId! },
    });

    const fullRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: roomDetailInclude(),
    });

    res.status(201).json(fullRoom);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      restaurantName,
      restaurantUrl,
      maxMembers,
      deliveryFee,
      minimumOrder,
      radiusKm,
      deadline,
    } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    if (room.hostId !== req.userId) return res.status(403).json({ message: '방장만 수정할 수 있습니다.' });

    const updated = await prisma.room.update({
      where: { id },
      data: {
        title,
        restaurantName,
        restaurantUrl,
        maxMembers: maxMembers ? Number(maxMembers) : undefined,
        deliveryFee: deliveryFee ? Number(deliveryFee) : undefined,
        minimumOrder: minimumOrder ? Number(minimumOrder) : undefined,
        radiusKm: radiusKm ? Number(radiusKm) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
      },
      include: roomDetailInclude(),
    });

    getIo().to(id).emit('room:updated', updated);
    res.json(updated);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: roomDetailInclude(),
    });
    if (!room) return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    res.json(room);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/:id/join', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!room) return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    if (new Date() > room.deadline) return res.status(400).json({ message: '이미 마감된 방입니다.' });
    if (room.status !== 'OPEN') return res.status(400).json({ message: '현재 참여할 수 없는 방입니다.' });
    if (room.members.length >= room.maxMembers) return res.status(400).json({ message: '방이 가득 찼습니다.' });

    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: id, userId } },
    });
    if (existing) return res.status(400).json({ message: '이미 참여 중인 방입니다.' });

    await prisma.roomMember.create({ data: { roomId: id, userId } });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    const sysMsg = await prisma.chatMessage.create({
      data: { roomId: id, content: `${user?.nickname}님이 참여했습니다.`, type: 'SYSTEM' },
    });

    const io = getIo();
    io.to(id).emit('room:member_joined', { userId, nickname: user?.nickname });
    io.to(id).emit('chat:message', {
      id: sysMsg.id,
      content: sysMsg.content,
      type: 'SYSTEM',
      createdAt: sysMsg.createdAt.toISOString(),
    });

    res.json({ message: '방에 참여했습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/:id/leave', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    if (room.hostId === userId) {
      return res.status(400).json({ message: '방장은 나갈 수 없습니다. 방을 취소해주세요.' });
    }

    await prisma.roomMember.delete({
      where: { roomId_userId: { roomId: id, userId } },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    const sysMsg = await prisma.chatMessage.create({
      data: { roomId: id, content: `${user?.nickname}님이 퇴장했습니다.`, type: 'SYSTEM' },
    });

    const io = getIo();
    io.to(id).emit('room:member_left', { userId });
    io.to(id).emit('chat:message', {
      id: sysMsg.id,
      content: sysMsg.content,
      type: 'SYSTEM',
      createdAt: sysMsg.createdAt.toISOString(),
    });

    res.json({ message: '방에서 나왔습니다.' });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    if (room.hostId !== req.userId) return res.status(403).json({ message: '방장만 상태를 변경할 수 있습니다.' });

    const updated = await prisma.room.update({
      where: { id },
      data: { status },
      include: roomDetailInclude(),
    });

    const io = getIo();
    io.to(id).emit('room:updated', updated);

    if (status === 'CANCELLED') {
      const sysMsg = await prisma.chatMessage.create({
        data: { roomId: id, content: '방장이 방을 취소했습니다.', type: 'SYSTEM' },
      });
      io.to(id).emit('chat:message', {
        id: sysMsg.id,
        content: sysMsg.content,
        type: 'SYSTEM',
        createdAt: sysMsg.createdAt.toISOString(),
      });
    }

    res.json(updated);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/:roomId/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const { name, price, quantity, options } = req.body;
    const userId = req.userId!;

    if (!name || !price) return res.status(400).json({ message: '메뉴 이름과 가격을 입력해주세요.' });

    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) return res.status(403).json({ message: '방 참여자만 주문을 추가할 수 있습니다.' });

    const item = await prisma.orderItem.create({
      data: {
        roomId,
        userId,
        name,
        price: Number(price),
        quantity: Number(quantity) || 1,
        options: options || null,
      },
      include: { user: { select: { id: true, nickname: true } } },
    });

    const allItems = await prisma.orderItem.findMany({ where: { roomId } });
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { minimumOrder: true, deliveryFee: true, deadline: true },
    });
    if (!room) return res.status(404).json({ message: '방을 찾을 수 없습니다.' });
    if (new Date() > room.deadline) return res.status(400).json({ message: '이미 마감된 방입니다.' });
    const totals = calcOrderTotals(
      allItems,
      room?.minimumOrder || 0,
      room?.deliveryFee || 0
    );

    const io = getIo();
    io.to(roomId).emit('order:item_added', { item, totals });

    res.status(201).json({ item, totals });
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/:roomId/chat', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const cursor = req.query.cursor as string | undefined;

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: { user: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(messages.reverse());
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/:roomId/settlement', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const settlement = await createSettlement(roomId, req.userId!);

    const io = getIo();
    io.to(roomId).emit('settlement:created', settlement);

    res.status(201).json(settlement);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    res.status(400).json({ message: msg });
  }
});

router.get('/:roomId/settlement', authenticate, async (req: AuthRequest, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { roomId: req.params.roomId },
      include: {
        shares: {
          include: { user: { select: { id: true, nickname: true } } },
          orderBy: { totalAmount: 'desc' },
        },
      },
    });
    if (!settlement) return res.status(404).json({ message: '정산 정보가 없습니다.' });
    res.json(settlement);
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
