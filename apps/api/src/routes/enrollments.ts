import { Router, Request, Response } from 'express';
import prisma from '@melue/db';
import { authenticate } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

router.post('/drafts', async (req: Request, res: Response) => {
  try {
    const { data, currentStep } = req.body;
    const draft = await prisma.enrollmentDraft.create({
      data: {
        data: data ?? {},
        currentStep: currentStep ?? 0,
        status: 'DRAFT',
      },
    });
    res.status(201).json({ success: true, data: draft });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create draft',
    });
  }
});

router.get('/drafts', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const p = Math.max(1, parseInt(page as string, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (p - 1) * l;

    const [drafts, total] = await Promise.all([
      prisma.enrollmentDraft.findMany({
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: l,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.enrollmentDraft.count(),
    ]);

    res.json({
      success: true,
      data: drafts,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
});

router.get('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const draft = await prisma.enrollmentDraft.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found' });
      return;
    }

    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
});

router.patch('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const { data, currentStep, status } = req.body;

    const existing = await prisma.enrollmentDraft.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Draft not found' });
      return;
    }

    const draft = await prisma.enrollmentDraft.update({
      where: { id },
      data: {
        ...(data !== undefined && { data }),
        ...(currentStep !== undefined && { currentStep }),
        ...(status && { status }),
      },
    });

    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update draft',
    });
  }
});

router.post('/drafts/:id/submit', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const draft = await prisma.enrollmentDraft.findUnique({ where: { id } });

    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found' });
      return;
    }

    if (draft.status === 'SUBMITTED') {
      res.status(400).json({ success: false, error: 'Draft already submitted' });
      return;
    }

    const wizardData = draft.data as Record<string, any>;

    const student = await prisma.student.create({
      data: {
        firstName: wizardData.firstName || '',
        middleName: wizardData.middleName || null,
        lastName: wizardData.lastName || '',
        dateOfBirth: new Date(wizardData.dateOfBirth || Date.now()),
        diagnosis: wizardData.diagnosis || null,
        programType: wizardData.programType || 'REGULAR',
        therapyGroup: wizardData.therapyGroup || 'BASIC_THERAPY',
        guardianName: wizardData.guardianName || null,
        guardianPhone: wizardData.guardianPhone || null,
        guardianEmail: wizardData.guardianEmail || null,
        ownerId: req.user!.id,
        status: 'IN_ASSESSMENT',
      },
    });

    await prisma.enrollmentDraft.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        studentId: student.id,
      },
    });

    res.status(201).json({ success: true, data: { student, draftId: id } });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit draft',
    });
  }
});

export { router as enrollmentRoutes };
