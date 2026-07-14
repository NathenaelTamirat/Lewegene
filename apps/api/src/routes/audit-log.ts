import { Router, Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('audit:view'));

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await AuditLogService.stats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, entity, startDate, endDate, page, limit } = req.query;
    const result = await AuditLogService.list({
      userId: userId as string | undefined,
      entity: entity as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
});

export { router as auditLogRoutes };
