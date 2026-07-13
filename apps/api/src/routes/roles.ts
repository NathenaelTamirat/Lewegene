import { Router, Request, Response } from 'express';
import { RoleService } from '../services/role.service';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createRoleSchema, updateRoleSchema } from '@melue/shared';
import { getParam } from '../utils/params';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/roles
router.get('/', async (_req: Request, res: Response) => {
  try {
    const roles = await RoleService.findAll();
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles',
    });
  }
});

// GET /api/roles/permissions
router.get('/permissions', async (_req: Request, res: Response) => {
  try {
    const permissions = await RoleService.getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch permissions',
    });
  }
});

// GET /api/roles/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const role = await RoleService.findById(getParam(req, 'id'));
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Role not found',
    });
  }
});

// POST /api/roles
router.post(
  '/',
  authorize('roles:create'),
  validate(createRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const role = await RoleService.create(req.body);
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create role',
      });
    }
  }
);

// PATCH /api/roles/:id
router.patch(
  '/:id',
  authorize('roles:edit'),
  validate(updateRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const role = await RoleService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data: role });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role',
      });
    }
  }
);

// DELETE /api/roles/:id
router.delete('/:id', authorize('roles:delete'), async (req: Request, res: Response) => {
  try {
    const result = await RoleService.delete(getParam(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete role',
    });
  }
});

// PUT /api/roles/:id/permissions
router.put(
  '/:id/permissions',
  authorize('permissions:edit'),
  async (req: Request, res: Response) => {
    try {
      const { permissionIds } = req.body;
      const result = await RoleService.updatePermissions(getParam(req, 'id'), permissionIds);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permissions',
      });
    }
  }
);

export { router as roleRoutes };
