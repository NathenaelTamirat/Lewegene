import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberDevice: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── User Schemas ───────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ─── Role Schemas ───────────────────────────────────────────────────────────

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').optional(),
  description: z.string().optional(),
});

// ─── Student Schemas ────────────────────────────────────────────────────────

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().datetime(),
  diagnosis: z.string().optional(),
  programType: z.enum(['REGULAR', 'PULLED_OUT']),
  therapyGroup: z.enum(['BASIC_THERAPY', 'FUNCTIONAL_LIVING_SKILLS']),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentQuerySchema = z.object({
  search: z.string().optional(),
  programType: z.enum(['REGULAR', 'PULLED_OUT']).optional(),
  therapyGroup: z.enum(['BASIC_THERAPY', 'FUNCTIONAL_LIVING_SKILLS']).optional(),
  status: z.enum([
    'IN_ASSESSMENT',
    'ASSESSMENT_COMPLETE',
    'READY_FOR_IUP',
    'ACTIVE_THERAPY',
    'INACTIVE',
  ]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ─── Goal Schemas ───────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  domainId: z.string().min(1, 'Domain is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['STANDARD', 'TASK_ANALYSIS']).default('STANDARD'),
  suggestedAgeMin: z.number().min(0).optional(),
  suggestedAgeMax: z.number().max(25).optional(),
  masteryCriteria: z.any().optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

// ─── Goal Assignment Schemas ────────────────────────────────────────────────

export const assignGoalSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  goalId: z.string().min(1, 'Goal is required'),
  station: z.enum(['STATION_1', 'STATION_2']),
  iupId: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Trial Schemas ──────────────────────────────────────────────────────────

export const logTrialSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  goalId: z.string().min(1, 'Goal assignment is required'),
  stepId: z.string().optional(), // For task analysis
  promptLevel: z.string().min(1, 'Prompt level is required'),
  outcome: z.enum(['SUCCESS', 'FAILURE']),
  notes: z.string().optional(),
});

// ─── Behavior Incident Schemas ──────────────────────────────────────────────

export const createBehaviorIncidentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  behaviorName: z.string().min(1, 'Behavior name is required'),
  category: z.string().optional(),
  frequency: z.number().min(0).optional(),
  intensity: z.string().optional(),
  location: z.string().optional(),
  antecedent: z.string().min(1, 'Antecedent is required'),
  consequence: z.string().min(1, 'Consequence is required'),
  notes: z.string().optional(),
});

// ─── Assessment Schemas ─────────────────────────────────────────────────────

export const createAssessmentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.enum(['SKILLS_ABLLS', 'BEHAVIOR_MASS', 'BEHAVIOR_FAST', 'PREFERENCE', 'SENSORY_TIME']),
});

// ─── IUP Schemas ────────────────────────────────────────────────────────────

export const createIUPSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
});

export const finalizeIUPSchema = z.object({
  goalAssignments: z.array(z.object({
    goalId: z.string(),
    station: z.enum(['STATION_1', 'STATION_2']),
    notes: z.string().optional(),
  })).min(1, 'At least one goal assignment is required'),
});

// ─── Session Schemas ────────────────────────────────────────────────────────

export const submitSessionSummarySchema = z.object({
  notes: z.string().optional(),
});

// ─── Pagination Schema ──────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentQueryInput = z.infer<typeof studentQuerySchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type AssignGoalInput = z.infer<typeof assignGoalSchema>;
export type LogTrialInput = z.infer<typeof logTrialSchema>;
export type CreateBehaviorIncidentInput = z.infer<typeof createBehaviorIncidentSchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type CreateIUPInput = z.infer<typeof createIUPSchema>;
export type FinalizeIUPInput = z.infer<typeof finalizeIUPSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
