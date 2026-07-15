import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { roleRoutes } from './routes/roles';
import { studentRoutes } from './routes/students';
import { goalRoutes } from './routes/goals';
import { trialRoutes } from './routes/trials';
import { assessmentRoutes } from './routes/assessments';
import { iupRoutes } from './routes/iups';
import { sessionRoutes } from './routes/sessions';
import { configRoutes } from './routes/config';
import { reportRoutes } from './routes/reports';
import { messageRoutes } from './routes/messages';
import { behaviorIncidentRoutes } from './routes/behavior-incidents';
import { domainRoutes } from './routes/domains';
import { scheduleRoutes } from './routes/schedules';
import { uploadRoutes } from './routes/uploads';
import { enrollmentRoutes } from './routes/enrollments';
import { auditLogRoutes } from './routes/audit-log';
import { directorNoteRoutes } from './routes/director-notes';

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes',
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Compression ────────────────────────────────────────────────────────────

app.use(compression());

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/iups', iupRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/behavior-incidents', behaviorIncidentRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/director-notes', directorNoteRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

export default app;
