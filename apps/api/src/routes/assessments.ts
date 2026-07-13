import { Router, Request, Response } from 'express';
import { AssessmentService } from '../services/assessment.service';
import { authenticate } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.post('/', async (req: Request, res: Response) => {
  try {
    const assessment = await AssessmentService.create(req.body);
    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const assessments = await AssessmentService.findByStudent(getParam(req, 'studentId'));
    res.json({ success: true, data: assessments });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const assessment = await AssessmentService.update(getParam(req, 'id'), req.body);
    res.json({ success: true, data: assessment });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const assessment = await AssessmentService.complete(getParam(req, 'id'));
    res.json({ success: true, data: assessment });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const assessment = await AssessmentService.review(getParam(req, 'id'));
    res.json({ success: true, data: assessment });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as assessmentRoutes };
