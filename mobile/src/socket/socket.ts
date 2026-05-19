import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  const url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
