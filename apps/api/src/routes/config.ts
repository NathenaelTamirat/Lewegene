import { Router, Request, Response } from 'express';
import { ConfigService } from '../services/config.service';
import { authenticate, authorize } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/:category', async (req: Request, res: Response) => {
  try {
    const configs = await ConfigService.getByCategory(getParam(req, 'category'));
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/key/:key', async (req: Request, res: Response) => {
  try {
    const config = await ConfigService.get(getParam(req, 'key'));
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(404).json({ success: false, error: error instanceof Error ? error.message : 'Not found' });
  }
});

router.put('/:key', authorize('config:edit'), async (req: Request, res: Response) => {
  try {
    const config = await ConfigService.set(getParam(req, 'key'), req.body.value);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.put('/', authorize('config:edit'), async (req: Request, res: Response) => {
  try {
    const result = await ConfigService.setMany(req.body.configs);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as configRoutes };
