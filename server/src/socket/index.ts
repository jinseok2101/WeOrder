import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { handleRoomJoin, handleChatSend, handleDeliveryArriving } from './handlers';

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

    // Join private user room for targeted notifications
    socket.join(`user:${userId}`);

    socket.on('room:join', async (roomId: string) => {
      await handleRoomJoin(socket, userId, roomId);
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on('chat:send', async (data: { roomId: string; content: string }) => {
      await handleChatSend(io, socket, userId, data);
    });

    socket.on('delivery:arriving', async (data: { roomId: string; minutes: number }) => {
      await handleDeliveryArriving(io, socket, userId, data);
    });

    socket.on('disconnect', () => {
    });
  });
}
