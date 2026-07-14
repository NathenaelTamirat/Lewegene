import { Router, Request, Response } from 'express';
import { BehaviorIncidentService } from '../services/behavior-incident.service';
import { authenticate } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.post('/', async (req: Request, res: Response) => {
  try {
    const incident = await BehaviorIncidentService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const incidents = await BehaviorIncidentService.findByStudent(getParam(req, 'studentId'));
    res.json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const incidents = await BehaviorIncidentService.findAll(req.query as any);
    res.json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await BehaviorIncidentService.delete(getParam(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as behaviorIncidentRoutes };
