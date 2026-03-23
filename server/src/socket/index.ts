import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export function setupSocket(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication error'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;

    socket.on('room:join', async (roomId: string) => {
      await socket.join(roomId);
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on('chat:send', async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!content?.trim()) return;

      try {
        const message = await prisma.chatMessage.create({
          data: { roomId, userId, content: content.trim(), type: 'USER' },
          include: { user: { select: { id: true, nickname: true } } },
        });

        io.to(roomId).emit('chat:message', {
          id: message.id,
          content: message.content,
          type: message.type,
          user: message.user,
          createdAt: message.createdAt.toISOString(),
        });
      } catch {
        socket.emit('error', { message: '메시지 전송에 실패했습니다.' });
      }
    });

    socket.on('disconnect', () => {
    });
  });
}
