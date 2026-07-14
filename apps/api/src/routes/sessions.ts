import { Router, Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { authenticate } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/active-block', async (_req: Request, res: Response) => {
  try {
    const block = await SessionService.getActiveBlock();
    res.json({ success: true, data: block });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/my-assignments', async (req: Request, res: Response) => {
  try {
    const { blockId } = req.query;
    const assignments = await SessionService.getTeacherAssignments(req.user!.id, blockId as string);
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:sessionId/summary', async (req: Request, res: Response) => {
  try {
    const summary = await SessionService.getBlockSummary(getParam(req, 'sessionId'));
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(404).json({ success: false, error: error instanceof Error ? error.message : 'Summary not found' });
  }
});

router.post('/:sessionId/submit', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const summary = await SessionService.submitBlockSummary(getParam(req, 'sessionId'), req.user!.id, notes);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to submit' });
  }
});

router.post('/:sessionId/draft', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const summary = await SessionService.saveDraftSummary(getParam(req, 'sessionId'), req.user!.id, notes);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to save draft' });
  }
});

router.post('/summaries', async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId, notes } = req.body;
    const summary = await SessionService.submitSummary(sessionId, studentId, req.user!.id, notes);
    res.status(201).json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/summaries/:id/submit', async (req: Request, res: Response) => {
  try {
    const summary = await SessionService.submitSession(getParam(req, 'id'));
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/summaries', async (req: Request, res: Response) => {
  try {
    const summaries = await SessionService.getSummaries(req.query as any);
    res.json({ success: true, data: summaries });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as sessionRoutes };
