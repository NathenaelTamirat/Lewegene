import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@melue/shared';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.resetPassword(req.body.token, req.body.password);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

export { router as authRoutes };
