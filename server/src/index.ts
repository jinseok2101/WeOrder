import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';

import app from './app';
import { initIo } from './io';
import { setupSocket } from './socket';

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initIo(io);
setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`WeOrder server running on http://localhost:${PORT}`);
});
