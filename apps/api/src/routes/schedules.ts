import { Router, Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { authenticate, authorize } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const schedules = await ScheduleService.listByDate(date);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/assign', authorize('schedule:edit'), async (req: Request, res: Response) => {
  try {
    const schedule = await ScheduleService.assign(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.delete('/:id', authorize('schedule:edit'), async (req: Request, res: Response) => {
  try {
    await ScheduleService.remove(getParam(req, 'id'));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/unavailability', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const unavailabilities = await ScheduleService.getUnavailability(date);
    res.json({ success: true, data: unavailabilities });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/unavailability', authorize('schedule:edit'), async (req: Request, res: Response) => {
  try {
    await ScheduleService.setUnavailability(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as scheduleRoutes };
