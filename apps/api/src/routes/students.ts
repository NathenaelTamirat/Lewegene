import { Router, Request, Response } from 'express';
import { StudentService } from '../services/student.service';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createStudentSchema, updateStudentSchema, studentQuerySchema } from '@melue/shared';
import { getParam } from '../utils/params';
import prisma from '@melue/db';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/students/parent — get children for parent user
router.get('/parent', async (req: Request, res: Response) => {
  try {
    const parentId = req.user!.id;
    const parentUser = await prisma.parentUser.findUnique({
      where: { userId: parentId },
    });

    if (!parentUser) {
      res.json({ success: true, data: [] });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { id: parentUser.studentId },
      select: { id: true, firstName: true, lastName: true },
    });

    res.json({ success: true, data: student ? [student] : [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch children',
    });
  }
});

// GET /api/students — list all
router.get('/', validate(studentQuerySchema, 'query'), async (req: Request, res: Response) => {
  try {
    const result = await StudentService.findAll(req.query as any);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch students',
    });
  }
});

// GET /api/students/:id/progress — get student progress
router.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const studentId = getParam(req, 'id');
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        goalAssignments: {
          where: { status: { in: ['ACTIVE', 'IN_PROGRESS', 'MASTERED'] } },
          include: {
            goal: { select: { name: true, type: true } },
          },
        },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, error: 'Student not found' });
      return;
    }

    const goals = student.goalAssignments.map((ga) => ({
      name: ga.goal.name,
      domain: (ga.goal as any).domain?.name || '',
      progress: ga.progress,
      status: ga.status,
    }));

    res.json({
      success: true,
      data: {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        goals,
        recentSessions: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch progress',
    });
  }
});

// GET /api/students/:id/observations — list home observations
router.get('/:id/observations', async (req: Request, res: Response) => {
  try {
    const studentId = getParam(req, 'id');
    const observations = await prisma.homeObservation.findMany({
      where: { studentId },
      include: {
        parent: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const result = observations.map((obs) => ({
      id: obs.id,
      date: obs.timestamp.toISOString(),
      behavior: obs.observation,
      notes: obs.observation,
      submittedBy: obs.parent?.user
        ? `${obs.parent.user.firstName} ${obs.parent.user.lastName}`
        : 'Unknown',
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch observations',
    });
  }
});

// POST /api/students/:id/observations — create home observation
router.post('/:id/observations', async (req: Request, res: Response) => {
  try {
    const studentId = getParam(req, 'id');
    const { behavior, notes } = req.body;

    const parentUser = await prisma.parentUser.findUnique({
      where: { userId: req.user!.id },
    });

    if (!parentUser) {
      res.status(403).json({ success: false, error: 'Parent profile not found' });
      return;
    }

    const observation = await prisma.homeObservation.create({
      data: {
        parentId: parentUser.id,
        studentId,
        observation: `${behavior}${notes ? ': ' + notes : ''}`,
      },
    });

    res.status(201).json({ success: true, data: observation });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create observation',
    });
  }
});

// GET /api/students/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const student = await StudentService.findById(getParam(req, 'id'));
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Student not found',
    });
  }
});

// POST /api/students
router.post(
  '/',
  authorize('students:create'),
  validate(createStudentSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await StudentService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create student',
      });
    }
  }
);

// PATCH /api/students/:id
router.patch(
  '/:id',
  authorize('students:edit'),
  validate(updateStudentSchema),
  async (req: Request, res: Response) => {
    try {
      const student = await StudentService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data: student });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update student',
      });
    }
  }
);

// POST /api/students/:id/status
router.post(
  '/:id/status',
  authorize('students:edit'),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const student = await StudentService.updateStatus(getParam(req, 'id'), status);
      res.json({ success: true, data: student });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      });
    }
  }
);

export { router as studentRoutes };
