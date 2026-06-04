import { Server, Socket } from 'socket.io';
import { prisma } from '../prisma';
import { notificationService } from '../services/notificationService';

export async function handleRoomJoin(socket: Socket, userId: string, roomId: string): Promise<void> {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (member) {
    await socket.join(roomId);
  } else {
    socket.emit('error', { message: '방 참여자만 참여할 수 있습니다.' });
  }
}

export async function handleChatSend(
  io: Server,
  socket: Socket,
  userId: string,
  { roomId, content }: { roomId: string; content: string }
): Promise<void> {
  if (!content?.trim()) return;

  try {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) {
      socket.emit('error', { message: '방 참여자만 메시지를 보낼 수 있습니다.' });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: { roomId, userId, content: content.trim(), type: 'USER' },
      include: { user: { select: { id: true, nickname: true } } },
    });

    io.to(roomId).emit('chat:message', {
      id: message.id,
      roomId: message.roomId,
      content: message.content,
      type: message.type,
      user: message.user,
      createdAt: message.createdAt.toISOString(),
    });

    // 상대방 참가자들에게 푸시 알림 발송 (비동기 수행)
    const otherMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        userId: { not: userId }
      },
      select: { userId: true }
    });
    const otherUserIds = otherMembers.map((m) => m.userId);
    if (otherUserIds.length > 0) {
      notificationService.sendPushNotification(
        otherUserIds,
        {
          title: `💬 ${message.user?.nickname || 'WeOrder'}`,
          body: message.content,
          data: { roomId, type: 'chat' }
        },
        'chat'
      );
    }
  } catch {
    socket.emit('error', { message: '메시지 전송에 실패했습니다.' });
  }
}

export async function handleDeliveryArriving(
  io: Server,
  socket: Socket,
  userId: string,
  { roomId, minutes }: { roomId: string; minutes: number }
): Promise<void> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { hostId: true, title: true }
    });
    if (!room) {
      socket.emit('error', { message: '존재하지 않는 방입니다.' });
      return;
    }
    if (room.hostId !== userId) {
      socket.emit('error', { message: '방장만 알림을 보낼 수 있습니다.' });
      return;
    }

    // 1. 방 참가자 전원에게 실시간 소켓 이벤트 전송
    io.to(roomId).emit('delivery:arriving', { roomId, minutes });

    // 2. 방 멤버들에게 푸시 알림 발송 (방장 제외)
    const otherMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        userId: { not: userId }
      },
      select: { userId: true }
    });
    const otherUserIds = otherMembers.map((m) => m.userId);
    if (otherUserIds.length > 0) {
      const title = `🛵 배달 도착 예정 알림!`;
      const body = minutes === 0 
        ? `배달이 지금 도착했습니다! 지금 음식을 받으러 공동 픽업지로 나와주세요!`
        : `배달이 약 ${minutes}분 후 도착 예정입니다! 시간에 맞춰 픽업지로 나와주세요!`;
      
      notificationService.sendPushNotification(
        otherUserIds,
        {
          title,
          body,
          data: { roomId, type: 'delivery_arriving', minutes }
        },
        'roomStatus'
      );
    }

    // 3. 채팅방에 시스템 메시지 저장 및 브로드캐스트
    const systemMsgContent = minutes === 0
      ? `📢 배달이 도착했습니다! 지금 음식을 받으러 공동 픽업지로 나와주세요!`
      : `📢 배달이 약 ${minutes}분 후 도착 예정입니다! 시간에 맞춰 픽업지 주소로 준비해서 나와주세요!`;
    
    const systemMsg = await prisma.chatMessage.create({
      data: { roomId, content: systemMsgContent, type: 'SYSTEM' }
    });
    
    io.to(roomId).emit('chat:message', {
      id: systemMsg.id,
      roomId: systemMsg.roomId,
      content: systemMsg.content,
      type: systemMsg.type,
      user: null,
      createdAt: systemMsg.createdAt.toISOString()
    });

  } catch (error) {
    socket.emit('error', { message: '배달 도착 예정 알림 전송에 실패했습니다.' });
  }
}
