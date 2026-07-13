import { z } from 'zod';

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

// ─── Permission Types ───────────────────────────────────────────────────────

export type PermissionModule =
  | 'students'
  | 'sessions'
  | 'goals'
  | 'assessments'
  | 'iups'
  | 'reports'
  | 'staff'
  | 'roles'
  | 'permissions'
  | 'config'
  | 'messages'
  | 'notifications';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export type PermissionString = `${PermissionModule}:${PermissionAction}`;

// ─── Role Types ─────────────────────────────────────────────────────────────

export type SystemRole =
  | 'System Administrator'
  | 'Institutional Administrator'
  | 'Director'
  | 'Program Director'
  | 'Therapy Coordinator'
  | 'Teacher';

// ─── Student Types ──────────────────────────────────────────────────────────

export type ProgramType = 'REGULAR' | 'PULLED_OUT';
export type TherapyGroup = 'BASIC_THERAPY' | 'FUNCTIONAL_LIVING_SKILLS';
export type StudentStatus =
  | 'IN_ASSESSMENT'
  | 'ASSESSMENT_COMPLETE'
  | 'READY_FOR_IUP'
  | 'ACTIVE_THERAPY'
  | 'INACTIVE';
export type Station = 'STATION_1' | 'STATION_2';

// ─── Goal Types ─────────────────────────────────────────────────────────────

export type GoalType = 'STANDARD' | 'TASK_ANALYSIS';
export type GoalStatus = 'ACTIVE' | 'IN_PROGRESS' | 'MASTERED' | 'PENDING_APPROVAL' | 'REMOVED';

// ─── Trial Types ────────────────────────────────────────────────────────────

export type TrialOutcome = 'SUCCESS' | 'FAILURE';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

// ─── Assessment Types ───────────────────────────────────────────────────────

export type AssessmentType =
  | 'SKILLS_ABLLS'
  | 'BEHAVIOR_MASS'
  | 'BEHAVIOR_FAST'
  | 'PREFERENCE'
  | 'SENSORY_TIME';
export type AssessmentStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETE' | 'REVIEWED';

// ─── IUP Types ──────────────────────────────────────────────────────────────

export type IUPStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

// ─── Mastery Types ──────────────────────────────────────────────────────────

export type MasteryStatus =
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

// ─── Session Types ──────────────────────────────────────────────────────────

export type SessionStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED';

// ─── Document Types ─────────────────────────────────────────────────────────

export type DocumentType =
  | 'BIRTH_CERTIFICATE'
  | 'MEDICAL_DIAGNOSIS'
  | 'AGREEMENT_DOCUMENT'
  | 'HEADSHOT_PHOTO'
  | 'BASELINE_VIDEO'
  | 'OTHER';

// ─── Draft Types ────────────────────────────────────────────────────────────

export type DraftStatus = 'DRAFT' | 'STALE' | 'SUBMITTED';

// ─── Report Types ───────────────────────────────────────────────────────────

export type ReportType =
  | 'SESSION_SUMMARY'
  | 'BI_ANNUAL'
  | 'STUDENT_PROGRESS'
  | 'FOUNDATION_OVERVIEW';
