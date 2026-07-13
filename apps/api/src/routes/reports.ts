import { Router, Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { authenticate, authorize } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/session-reports', async (req: Request, res: Response) => {
  try {
    const result = await ReportService.getSessionSummaries(req.query as any);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/student-progress/:studentId', async (req: Request, res: Response) => {
  try {
    const progress = await ReportService.getStudentProgress(getParam(req, 'studentId'));
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/foundation-overview', authorize('reports:view'), async (_req: Request, res: Response) => {
  try {
    const overview = await ReportService.getFoundationOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/bi-annual/:studentId', async (req: Request, res: Response) => {
  try {
    const report = await ReportService.generateBiAnnual(getParam(req, 'studentId'));
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as reportRoutes };
