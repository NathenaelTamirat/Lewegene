import { Router, Request, Response } from 'express';
import { StudentService } from '../services/student.service';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createStudentSchema, updateStudentSchema, studentQuerySchema } from '@melue/shared';
import { getParam } from '../utils/params';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/students
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
