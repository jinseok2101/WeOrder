import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import ordersRouter from './routes/orders';
import settlementRouter from './routes/settlement';
import addressesRouter from './routes/addresses';
import reviewsRouter from './routes/reviews';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/settlement', settlementRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api', reviewsRouter);

export default app;
