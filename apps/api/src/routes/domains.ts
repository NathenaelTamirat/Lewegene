import { Router, Request, Response } from 'express';
import { DomainService } from '../services/domain.service';
import { authenticate, authorize } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const domains = await DomainService.list();
    res.json({ success: true, data: domains });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/', authorize('config:edit'), async (req: Request, res: Response) => {
  try {
    const domain = await DomainService.create(req.body);
    res.status(201).json({ success: true, data: domain });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.put('/:id', authorize('config:edit'), async (req: Request, res: Response) => {
  try {
    const domain = await DomainService.update(getParam(req, 'id'), req.body);
    res.json({ success: true, data: domain });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.delete('/:id', authorize('config:edit'), async (req: Request, res: Response) => {
  try {
    await DomainService.remove(getParam(req, 'id'));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as domainRoutes };
