import { Router, Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { authenticate } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, content, subject, recipientId } = req.body;
    const message = await MessageService.send(req.user!.id, studentId, content, subject, recipientId);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const messages = await MessageService.getInbox(req.user!.id);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const result = await MessageService.markRead(getParam(req, 'id'), req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as messageRoutes };
