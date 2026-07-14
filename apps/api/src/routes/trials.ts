import { Router, Request, Response } from 'express';
import { TrialService } from '../services/trial.service';
import { MasteryCheckService } from '../services/mastery-check.service';
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

// GET /api/trials/mastery-eligible
router.get('/mastery-eligible', async (_req: Request, res: Response) => {
  try {
    const eligible = await MasteryCheckService.getEligibleGoals();
    res.json({ success: true, data: eligible });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch eligible goals',
    });
  }
});

// GET /api/trials/mastery-checks
router.get('/mastery-checks', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const checks = await MasteryCheckService.getChecks(status as string);
    res.json({ success: true, data: checks });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch mastery checks',
    });
  }
});

// POST /api/trials/mastery-checks/initiate
router.post('/mastery-checks/initiate', async (req: Request, res: Response) => {
  try {
    const result = await MasteryCheckService.initiate(req.body, req.user!.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate mastery check',
    });
  }
});

// POST /api/trials/mastery-checks/:id/verify
router.post('/mastery-checks/:id/verify', async (req: Request, res: Response) => {
  try {
    const result = await MasteryCheckService.verify(
      getParam(req, 'id'),
      req.body,
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit verification',
    });
  }
});

// POST /api/trials/mastery-checks/:id/approve
router.post('/mastery-checks/:id/approve', async (req: Request, res: Response) => {
  try {
    const result = await MasteryCheckService.approve(
      getParam(req, 'id'),
      req.body,
      req.user!.id
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve mastery check',
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
