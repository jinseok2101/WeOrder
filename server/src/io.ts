import { Server } from 'socket.io';

let _io: Server | null = null;

export function initIo(io: Server): void {
  _io = io;
}

export function getIo(): Server {
  if (!_io) throw new Error('Socket.io has not been initialized');
  return _io;
}
