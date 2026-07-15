import { Router, Request, Response } from 'express';
import prisma from '@melue/db';
import { authenticate, requireRole } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.post('/', requireRole('Director', 'Program Director'), async (req: Request, res: Response) => {
  try {
    const { studentId, content } = req.body;

    if (!studentId || !content) {
      return res.status(400).json({ success: false, error: 'studentId and content are required' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const note = await prisma.directorNote.create({
      data: {
        studentId,
        authorId: req.user!.id,
        content,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = getParam(req, 'studentId');

    const notes = await prisma.directorNote.findMany({
      where: { studentId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.patch('/:id', requireRole('Director', 'Program Director'), async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    const existing = await prisma.directorNote.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    if (existing.authorId !== req.user!.id && !req.user!.roles.includes('Director')) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this note' });
    }

    const note = await prisma.directorNote.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({ success: true, data: note });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

router.delete('/:id', requireRole('Director', 'Program Director'), async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');

    const existing = await prisma.directorNote.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    if (existing.authorId !== req.user!.id && !req.user!.roles.includes('Director')) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this note' });
    }

    await prisma.directorNote.delete({ where: { id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
  }
});

export { router as directorNoteRoutes };
