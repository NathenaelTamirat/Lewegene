import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createUserSchema, updateUserSchema, paginationSchema } from '@melue/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to extract single param
const getParam = (req: Request, name: string): string => {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
};

// GET /api/users
router.get('/', validate(paginationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const result = await UserService.findAll(req.query as any);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
});

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await UserService.findById(getParam(req, 'id'));
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'User not found',
    });
  }
});

// POST /api/users
router.post(
  '/',
  authorize('staff:create'),
  validate(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await UserService.create(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      });
    }
  }
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  authorize('staff:edit'),
  validate(updateUserSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await UserService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      });
    }
  }
);

// POST /api/users/:id/deactivate
router.post('/:id/deactivate', authorize('staff:delete'), async (req: Request, res: Response) => {
  try {
    const result = await UserService.deactivate(getParam(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate user',
    });
  }
});

// POST /api/users/:id/reset-password
router.post(
  '/:id/reset-password',
  authorize('staff:edit'),
  async (req: Request, res: Response) => {
    try {
      const result = await UserService.resetPassword(getParam(req, 'id'));
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset password',
      });
    }
  }
);

export { router as userRoutes };
