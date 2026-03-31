import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminInitTokenRoutes from './routes/adminInitTokens';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5100);

const FRONTEND_URLS = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || FRONTEND_URLS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use('/api', adminInitTokenRoutes);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Vendor server is running' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack || err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Vendor server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});