import { Router, Request, Response } from 'express';
import { TrialService } from '../services/trial.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { logTrialSchema } from '@melue/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to extract single param
const getParam = (req: Request, name: string): string => {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
};

// POST /api/trials
router.post('/', validate(logTrialSchema), async (req: Request, res: Response) => {
  try {
    const trial = await TrialService.log(req.body, req.user!.id);
    res.status(201).json({ success: true, data: trial });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log trial',
    });
  }
});

// POST /api/trials/sync
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { trials } = req.body;
    const result = await TrialService.syncTrials(trials, req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync trials',
    });
  }
});

// GET /api/trials/pending-sync
router.get('/pending-sync', async (_req: Request, res: Response) => {
  try {
    const trials = await TrialService.getPendingSync();
    res.json({ success: true, data: trials });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending trials',
    });
  }
});

// POST /api/trials/mark-synced
router.post('/mark-synced', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const result = await TrialService.markSynced(ids);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark trials as synced',
    });
  }
});

// GET /api/trials/student/:studentId
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.query;
    const trials = await TrialService.getStudentTrials(
      getParam(req, 'studentId'),
      goalId as string
    );
    res.json({ success: true, data: trials });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trials',
    });
  }
});

export { router as trialRoutes };
