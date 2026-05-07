import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { errorMiddleware } from './middleware/error.middleware';

const app: Application = express();

app.use(helmet());
app.use(cors({
  // origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, mobile apps)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow the configured frontend URL in production
    const allowed = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (origin === allowed) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limit auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

app.use('/api', router);

app.use(errorMiddleware);

export default app;
