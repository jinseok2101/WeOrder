import { prisma } from '../prisma';

export async function createSettlement(roomId: string, hostId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      settlement: true,
      members: { include: { user: { select: { id: true, nickname: true } } } },
      orderItems: true,
    },
  });

  if (!room) throw new Error('방을 찾을 수 없습니다.');
  if (room.hostId !== hostId) throw new Error('방장만 정산을 생성할 수 있습니다.');
  if (room.settlement) throw new Error('이미 정산이 생성된 방입니다.');

  const memberCount = room.members.length;
  if (memberCount === 0) throw new Error('참여 멤버가 없습니다.');

  const { deliveryFee } = room;

  const memberMenuAmounts = new Map<string, number>();
  for (const item of room.orderItems) {
    const cur = memberMenuAmounts.get(item.userId) || 0;
    memberMenuAmounts.set(item.userId, cur + item.price * item.quantity);
  }

  const normalSplit = Math.ceil(deliveryFee / memberCount);
  const hostSplit = deliveryFee - normalSplit * (memberCount - 1);

  const totalMenuAmount = Array.from(memberMenuAmounts.values()).reduce(
    (a, b) => a + b,
    0
  );
  const totalAmount = totalMenuAmount + deliveryFee;

  const settlement = await prisma.settlement.create({
    data: {
      roomId,
      totalAmount,
      deliveryFee,
      status: 'IN_PROGRESS',
      shares: {
        create: room.members.map((member) => {
          const isHost = member.userId === hostId;
          const deliverySplit = isHost ? hostSplit : normalSplit;
          const menuAmount = memberMenuAmounts.get(member.userId) || 0;
          return {
            userId: member.userId,
            menuAmount,
            deliverySplit,
            totalAmount: menuAmount + deliverySplit,
            status: 'REQUESTED' as const,
          };
        }),
      },
    },
    include: {
      shares: {
        include: {
          user: { select: { id: true, nickname: true } },
        },
      },
    },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'ORDERED' },
  });

  return settlement;
}
