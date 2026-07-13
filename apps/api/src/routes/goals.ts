import { Router, Request, Response } from 'express';
import { GoalService } from '../services/goal.service';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createGoalSchema, updateGoalSchema, paginationSchema } from '@melue/shared';
import { getParam } from '../utils/params';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/goals
router.get('/', validate(paginationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const result = await GoalService.findAll(req.query as any);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch goals',
    });
  }
});

// GET /api/goals/caseload/:studentId
router.get('/caseload/:studentId', async (req: Request, res: Response) => {
  try {
    const caseload = await GoalService.getStudentCaseload(getParam(req, 'studentId'));
    res.json({ success: true, data: caseload });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch caseload',
    });
  }
});

// GET /api/goals/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const goal = await GoalService.findById(getParam(req, 'id'));
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Goal not found',
    });
  }
});

// POST /api/goals
router.post(
  '/',
  authorize('goals:create'),
  validate(createGoalSchema),
  async (req: Request, res: Response) => {
    try {
      const goal = await GoalService.create(req.body);
      res.status(201).json({ success: true, data: goal });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create goal',
      });
    }
  }
);

// PATCH /api/goals/:id
router.patch(
  '/:id',
  authorize('goals:edit'),
  validate(updateGoalSchema),
  async (req: Request, res: Response) => {
    try {
      const goal = await GoalService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data: goal });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update goal',
      });
    }
  }
);

// POST /api/goals/:id/deactivate
router.post('/:id/deactivate', authorize('goals:edit'), async (req: Request, res: Response) => {
  try {
    const result = await GoalService.deactivate(getParam(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate goal',
    });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', authorize('goals:delete'), async (req: Request, res: Response) => {
  try {
    const result = await GoalService.delete(getParam(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete goal',
    });
  }
});

// POST /api/goals/assign
router.post(
  '/assign',
  authorize('goals:edit'),
  async (req: Request, res: Response) => {
    try {
      const assignment = await GoalService.assignToStudent(req.body);
      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign goal',
      });
    }
  }
);

// DELETE /api/goals/assign/:assignmentId
router.delete(
  '/assign/:assignmentId',
  authorize('goals:edit'),
  async (req: Request, res: Response) => {
    try {
      const result = await GoalService.removeFromStudent(getParam(req, 'assignmentId'));
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove goal',
      });
    }
  }
);

export { router as goalRoutes };
