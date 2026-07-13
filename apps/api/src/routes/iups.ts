import { Router, Request, Response } from 'express';
import { IUPService } from '../services/iup.service';
import { authenticate, authorize } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const iups = await IUPService.getAll();
    res.json({ success: true, data: iups });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/', authorize('iups:create'), async (req: Request, res: Response) => {
  try {
    const iup = await IUPService.create(req.body);
    res.status(201).json({ success: true, data: iup });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const iups = await IUPService.findByStudent(getParam(req, 'studentId'));
    res.json({ success: true, data: iups });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const iup = await IUPService.findById(getParam(req, 'id'));
    res.json({ success: true, data: iup });
  } catch (error) {
    res.status(404).json({ success: false, error: error instanceof Error ? error.message : 'Not found' });
  }
});

router.patch('/:id', authorize('iups:edit'), async (req: Request, res: Response) => {
  try {
    const iup = await IUPService.update(getParam(req, 'id'), req.body);
    res.json({ success: true, data: iup });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/assign-goals', authorize('iups:edit'), async (req: Request, res: Response) => {
  try {
    const result = await IUPService.assignGoals(getParam(req, 'id'), req.body.assignments);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/finalize', authorize('iups:approve'), async (req: Request, res: Response) => {
  try {
    const iup = await IUPService.finalize(getParam(req, 'id'));
    res.json({ success: true, data: iup });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/archive', authorize('iups:edit'), async (req: Request, res: Response) => {
  try {
    const iup = await IUPService.archive(getParam(req, 'id'));
    res.json({ success: true, data: iup });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as iupRoutes };
