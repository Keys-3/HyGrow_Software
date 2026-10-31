import express from 'express';
import cors from 'cors';
import diseaseRoutes from './routes/disease.js';
import growthRoutes from './routes/growthPrediction.js';
import emailRoutes from './routes/email.js';
import paymentRoutes from './routes/payment.js';
import ordersRoutes from './routes/orders.js';
import chatRoutes from './routes/chat.js';
import { requireAuth } from './middleware/auth.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { errorHandler, HttpError } from './utils/errors.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006').split(',').map(value => value.trim()).filter(Boolean);
  app.use(cors({ origin(origin, callback) {
    if (!origin || origins.includes(origin)) callback(null, true);
    else callback(new HttpError(403, 'Origin is not allowed.'));
  }, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type'] }));
  app.use(express.json({ limit: '7mb', strict: true }));
  const limited = createRateLimit();
  app.use(['/api', '/growth', '/chat'], requireAuth, limited);
  app.use('/growth', growthRoutes);
  app.use('/chat', chatRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/email', createRateLimit({ max: 5, windowMs: 3600000 }), emailRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api', diseaseRoutes);
  app.get('/', (req, res) => res.json({ success: true, message: 'HyGrow Backend Running' }));
  app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found.' }));
  app.use(errorHandler);
  return app;
}
