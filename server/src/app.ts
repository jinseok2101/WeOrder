import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import ordersRouter from './routes/orders';
import settlementRouter from './routes/settlement';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/settlement', settlementRouter);

export default app;
