# Melue Foundation Therapy Management System — Product Backlog

**Source document:** Melue_SRS.docx (v1.0, June 16, 2026)
**Generated:** July 13, 2026
**Structure:** Flat, prioritized task list grouped by module, ordered to follow the natural build sequence (foundation → student lifecycle → operations → oversight → configuration).

## How to read this backlog

- Each task is scoped to **one module** and sized to be independently plannable (roughly a sprint-ready story, not an epic).
- **Priority** uses MoSCoW, derived from the SRS's own Shall/Should/May conventions (Section 1.2) and MVP scope (Section 1.4):
  - **P0 – Must**: Core MVP flow; system doesn't work without it.
  - **P1 – Should**: Important but the MVP can ship with a manual/interim workaround.
  - **P2 – Could**: Enhancement, defensible to slip a release.
- **Source** cites the SRS requirement IDs (FR-xxx / NFR-xxx / OR-xxx / section) so every task is traceable back to the document.
- **Depends on** flags hard sequencing — build that task first.
- Tasks tagged **⚠️ Inferred** cover screens listed in the SRS's Screen Inventory (Section 4.1) or Scope (1.4) that don't have their own numbered functional requirements in Section 3. I've called these out explicitly rather than quietly assuming behavior — see "Gaps & Judgment Calls" at the end.

## Module summary

| # | Module | Tasks | Notes |
|---|--------|-------|-------|
| 0 | Platform Foundation & Infrastructure | 5 | Not an SRS module — technical prerequisite for everything else |
| 1 | Authentication & User Management | 6 | SRS 3.1 |
| 2 | Student Enrollment & Placement | 11 | SRS 3.2 |
| 3 | 6-Week Assessment Phase | 12 | SRS 3.3 |
| 4 | Assessment Review & IUP Generation | 10 | SRS 3.4 |
| 5 | Goal Bank & Clinical Quality Management | 10 | SRS 3.5 |
| 6 | Active Therapy Delivery | 16 | SRS 3.6 — largest module, core daily workflow |
| 7 | Staff Scheduling & Operational Management | 7 | SRS 3.7 |
| 8 | Reporting & Oversight | 7 | SRS 3.8 |
| 9 | System Administration & Configuration | 9 | SRS 3.9 |
| 10 | Parent Portal & Communication | 4 | ⚠️ Inferred from screen inventory, not Section 3 |
| 11 | Cross-Cutting: Interfaces, Security, NFRs, Compliance | 9 | SRS Sections 4–6 |

**Total: 106 tasks**

---

## Module 0 — Platform Foundation & Infrastructure

*Not an SRS-numbered module, but nothing in Modules 1–11 can be built or tested without it. Sequence this first.*

#### INFRA-01 — Project Scaffolding & Environments
**Priority:** P0 | **Source:** Section 2.3 (Operating Environment)

Stand up the three application shells and the environments they'll run in.

**Acceptance Criteria**
- React Native tablet app shell builds and runs on Android 10+ and iPadOS 15+
- Responsive web admin shell runs on Chrome/Firefox/Safari/Edge (latest 2 versions)
- Backend REST API skeleton (PostgreSQL-backed) deployed to dev/staging/prod environments
- CI/CD pipeline builds, tests, and deploys all three on merge

#### INFRA-02 — Core Data Model
**Priority:** P0 | **Source:** Sections 3.1–3.9 (entity relationships implied across all modules)

Design and implement the relational schema underpinning students, staff, roles, sessions, goals, assessments, and IUPs before any feature module is built against it.

**Acceptance Criteria**
- Schema covers Student, Staff, Role, Permission, Station/Room, Session Block, Goal, Assessment, IUP, Trial, ABC Incident as first-class entities with correct relationships
- Migrations are versioned and repeatable across environments
- Schema reviewed against Section 3.4.3 (IUP structure) and 3.6.3 (ABC fields) for field-level completeness

#### INFRA-03 — Offline-First Sync Framework
**Priority:** P0 | **Source:** Sections 2.3.3, 2.4, 4.4, NFR-001–002

Build the local SQLite store and background sync engine that every tablet-facing feature (Modules 3, 6 especially) depends on.

**Acceptance Criteria**
- All CRUD operations work fully offline, writing to local SQLite
- Background sync auto-triggers on reconnect; queued records marked pending/synced/failed
- Conflict resolution is server-authoritative, **except** trial data, where most-recent-valid-data wins (per Section 4.4)
- Failed syncs retry with exponential backoff
- Visual sync-status indicator is available to any screen that needs it
- Trial tap-to-confirmation latency stays under 500ms regardless of connectivity (NFR-001)

#### INFRA-04 — RBAC Enforcement Engine
**Priority:** P0 | **Source:** FR-017, NFR-012 | **Depends on:** INFRA-02

Build the core permission-checking middleware that Module 1 (role admin UI) and Module 9 (config UI) will manage, and that every API endpoint will call.

**Acceptance Criteria**
- Every API endpoint checks caller's effective permissions (union of all assigned roles) before executing
- Denials return consistent 403 responses with no data leakage
- Permission checks are enforced identically in staging and prod (no dev-only bypass shipped)

#### INFRA-05 — Secure File Storage Integration
**Priority:** P0 | **Source:** Section 4.3 (File Storage Service), NFR-009, NFR-017

Integrate cloud object storage for documents, photos, and videos ahead of Module 2 (enrollment uploads) and Module 6 (session media).

**Acceptance Criteria**
- Files organized by student ID and content type in the storage bucket
- All stored files encrypted at rest (AES-256)
- Access requires a valid signed URL scoped to an authorized, authenticated request
- Upload rejects files over 10MB or outside allowed types (PDF, JPEG, PNG, DOC/DOCX)

---

## Module 1 — Authentication & User Management

*SRS 3.1. Related screens: SCR-001, SCR-SYS-001–003.*

#### AUTH-01 — Login Screen & Email/Password Authentication
**Priority:** P0 | **Source:** FR-001–005 | **Depends on:** INFRA-04

Enable staff and parents to sign in with validated credentials, a persistent "remember device" option, and self-service password reset.

**Acceptance Criteria**
- Login screen shows the Melue Foundation logo and "Sign In to Your Account" header
- Email field is validated for proper format before submission is allowed
- "Remember this device" persists the session across app/browser restarts
- "Forgot Password?" sends a reset link to the registered email
- Invalid credentials produce a clear, non-revealing error message

#### AUTH-02 — Role-Based Post-Login Routing
**Priority:** P0 | **Source:** FR-006 | **Depends on:** AUTH-01

Route each authenticated user straight to their correct starting dashboard.

**Acceptance Criteria**
- Teachers land on SCR-TEA-001; Coordinators on SCR-TC-001; Program Directors on SCR-PD-001; Directors on SCR-DIR-001; both Admin types on SCR-ADMIN-000; Parents on SCR-PAR-001
- A user with multiple roles is routed to a single, sensible default (documented decision, not silent behavior)

#### AUTH-03 — Multi-Role Assignment & Permission Union
**Priority:** P0 | **Source:** FR-007 | **Depends on:** INFRA-04

Support assigning more than one role to a staff member with additive permissions.

**Acceptance Criteria**
- A staff member can hold 2+ roles simultaneously (e.g., Teacher + Therapy Coordinator)
- Effective permissions equal the union of all assigned roles' privileges
- Removing one role doesn't strip privileges granted by a remaining role

#### AUTH-04 — Staff Account Management
**Priority:** P0 | **Source:** FR-008–011 | **Screen:** SCR-SYS-001

Give System Administrators full lifecycle control over staff accounts.

**Acceptance Criteria**
- Admins can view, add, edit, and deactivate staff accounts
- Staff email uniqueness is validated system-wide
- Admins can trigger a password-reset email on a staff member's behalf
- Toggling a staff account to "Inactive" immediately blocks login for that account

#### AUTH-05 — Role Management (Custom Roles)
**Priority:** P1 | **Source:** FR-012–015 | **Screen:** SCR-SYS-002

Let System Administrators define roles beyond the built-in set.

**Acceptance Criteria**
- Every staff member must have at least one designated role to access the system
- Admins can create, edit, and delete custom roles
- Deletion is blocked for roles currently assigned to active staff
- System-critical roles (System Administrator, Institutional Administrator) are marked non-deletable

#### AUTH-06 — Permission Configuration (RBAC Matrix)
**Priority:** P0 | **Source:** FR-016–018 | **Screen:** SCR-SYS-003 | **Depends on:** INFRA-04

Build the action-level permission editor that makes RBAC configurable without code changes — a stated primary objective of the system.

**Acceptance Criteria**
- Admins can set View/Create/Edit/Delete/Approve permissions per role, per module
- Permissions enforced at both UI (hide/show controls) and API level, matching INFRA-04 behavior
- "Reset to Default" and "Copy from Role" presets are available to speed up configuration

---

## Module 2 — Student Enrollment & Placement

*SRS 3.2. Related screens: SCR-006, SCR-006A, SCR-006B, SCR-009, SCR-ADMIN-001.*

#### ENR-01 — Student Register (List View)
**Priority:** P0 | **Source:** FR-019 | **Screen:** SCR-006

Provide the searchable roster all downstream staff will use to find students.

**Acceptance Criteria**
- List displays name, age, program type, and therapy group for every enrolled student
- Search works by student name
- List is paginated/virtualized to stay performant at 500 students (NFR-002 scale target)

#### ENR-02 — Student Register Filtering
**Priority:** P0 | **Source:** FR-020 | **Depends on:** ENR-01

**Acceptance Criteria**
- Filter by Program Type (Regular, Pulled Out)
- Filter by Therapy Group (Basic Therapy, Functional Living Skills)
- Filters are combinable and clearable in one action

#### ENR-03 — Enrollment Wizard: Core Info Capture
**Priority:** P0 | **Source:** FR-021 | **Screen:** SCR-009 | **Depends on:** INFRA-02

Build the guided multi-step wizard for capturing a new student's baseline information.

**Acceptance Criteria**
- Captures child's full name (first/middle/last), DOB with auto-calculated age, diagnosis info, parent/guardian name and contact phone
- Includes the parent interview question form, fillable by staff
- Wizard state persists between steps without data loss

#### ENR-04 — Enrollment Required-Field Validation
**Priority:** P0 | **Source:** FR-022 | **Depends on:** ENR-03

**Acceptance Criteria**
- "Confirm & Enroll" is disabled until all required fields are complete
- Required-field set is read from admin configuration (SCR-ADMIN-001), not hard-coded
- Missing fields are clearly flagged inline

#### ENR-05 — Enrollment Document Upload
**Priority:** P0 | **Source:** FR-023 | **Depends on:** INFRA-05

**Acceptance Criteria**
- Supports upload of Birth Certificate, Medical Diagnosis Paper, and Agreement Document
- Enforces file type and 10MB size limits (INFRA-05)
- Uploaded documents are linked to the student's record and encrypted at rest

#### ENR-06 — Headshot Photo & Baseline Video Capture
**Priority:** P0 | **Source:** FR-024a–f | **Depends on:** INFRA-05

**Acceptance Criteria**
- Headshot photo capture/upload is required to complete enrollment
- Baseline video is optional and never blocks enrollment completion
- If uploaded, the video is stored securely and linked to the student record
- Baseline video can be added later, and by Program Director or Therapy Coordinator after enrollment, not just during it
- Student profile visibly indicates whether a baseline video exists

#### ENR-07 — Program Type, Therapy Group Selection & Age Validation
**Priority:** P0 | **Source:** FR-025–026

**Acceptance Criteria**
- Program Type (Regular/Pulled Out) and Therapy Group (Basic Therapy/Functional Living Skills) are required selections
- System warns on mismatch: Basic Therapy expects ages 3–12, Functional Living Skills expects 13–19
- Warning doesn't hard-block override if staff confirm intentionally

#### ENR-08 — Enrollment Draft Save & Stale-Draft Notification
**Priority:** P0 | **Source:** FR-027, Section 2.4 (Draft-Saving)

**Acceptance Criteria**
- Wizard can be saved as a draft at any step and resumed later
- An in-app notification fires if a draft sits untouched past the configured period (default from SCR-ADMIN-004)

#### ENR-09 — Enrollment Finalization → "In Assessment" Status
**Priority:** P0 | **Source:** FR-028 | **Depends on:** ENR-04, ENR-05, ENR-06, ENR-07

**Acceptance Criteria**
- Successful "Confirm & Enroll" creates a student record with status "In Assessment"
- Student immediately appears in the Student Register (ENR-01)

#### ENR-10 — Student Profile & Edit Screens
**Priority:** P0 | **Source:** FR-029–031 | **Screens:** SCR-006A, SCR-006B

**Acceptance Criteria**
- Profile (SCR-006A) shows photo, name, age, guardian info, contact, program, therapy group, station, and current goals (up to 2 per station)
- Therapy Coordinators and Program Directors can edit via SCR-006B
- Navigating away from an edit/enrollment form with unsaved changes triggers a confirmation dialog

#### ENR-11 — Enrollment Form Builder Wiring
**Priority:** P1 | **Source:** FR-032–033 | **Screen:** SCR-ADMIN-001 | **Depends on:** ADM-02

Connect the enrollment form specifically to the Form Builder engine built in Module 9.

**Acceptance Criteria**
- Institutional Admins can add, remove, reorder, toggle visibility, and relabel enrollment fields
- JSON/XML form templates can be uploaded to pre-populate the enrollment structure

---

## Module 3 — 6-Week Assessment Phase

*SRS 3.3. Related screens: SCR-010, SCR-012, SCR-TEA-002, SCR-TEA-003, SCR-ADMIN-001.*

#### ASM-01 — 6-Week Assessment Dashboard
**Priority:** P0 | **Source:** FR-034 | **Screen:** SCR-010

**Acceptance Criteria**
- Shows a scrollable list of the logged-in teacher's students currently in "In Assessment" status
- List updates as students move through the assessment pipeline

#### ASM-02 — Assessment Launch & Draft Save/Resume
**Priority:** P0 | **Source:** FR-035–036 | **Depends on:** ASM-01

**Acceptance Criteria**
- Teacher can launch Skills, Behavior, or Preference Assessment sessions from the dashboard
- Any in-progress assessment can be saved as a draft and resumed without data loss

#### ASM-03 — Skills Assessment (ABLLS) Scoring UI
**Priority:** P0 | **Source:** FR-037–038, Section 3.3.3 | **Screen:** SCR-TEA-002

**Acceptance Criteria**
- Skill items are organized by domain, each domain in its own tab
- Each item shows its unique ID (e.g., B1, B2) and full description
- Scoring uses the 0 (Red) / 1 (Yellow) / 2 (Green) / N/A (Grey) scale with the color key always visible on screen
- Teachers can attach optional notes per skill item
- Default ABLLS items are pre-loaded per Section 3.3.3 and editable via Form Builder

#### ASM-04 — Need Analysis Summary & Progress Bar
**Priority:** P0 | **Source:** FR-039–040 | **Depends on:** ASM-03

**Acceptance Criteria**
- System auto-generates a Need Analysis Summary highlighting domains with the most 0s/1s
- A completion-percentage progress bar is visible throughout the assessment

#### ASM-05 — Behavior Assessment: MASS Questionnaire
**Priority:** P0 | **Source:** FR-041–042 | **Screen:** SCR-TEA-003

**Acceptance Criteria**
- Records MASS responses on a 0–6 Likert scale
- Auto-calculates Sensory, Escape, Attention, and Tangible function scores from responses

#### ASM-06 — Behavior Assessment: FAST Questionnaire
**Priority:** P0 | **Source:** FR-043–044

**Acceptance Criteria**
- Records FAST responses as Yes/No
- Auto-calculates risk indicators from the response set

#### ASM-07 — ABC Incident Logging During Assessment
**Priority:** P0 | **Source:** FR-045–046

**Acceptance Criteria**
- Teachers can add, edit, and delete ABC-model behavior incidents within the assessment log
- Each entry captures Antecedent, Behavior, and Consequence

#### ASM-08 — Preference Assessment: Engagement Tracking
**Priority:** P0 | **Source:** FR-047a–c | **Screen:** SCR-012

**Acceptance Criteria**
- Covers three contexts: Sensory Time, Circle Time, Play Time, each with its categorized item inventory (Visual, Auditory, Tactile, Toys, Movement, etc.)
- Each item supports a start/pause engagement timer and an increment/decrement frequency counter
- Items auto-rank by duration, frequency, and a combined weighted score

#### ASM-09 — Preference Assessment: Ranked Results & Custom Items
**Priority:** P0 | **Source:** FR-047d–f, FR-048 | **Depends on:** ASM-08

**Acceptance Criteria**
- Ranked list shows rank, item name, category, total duration, and frequency count
- Teachers can add per-item notes
- Teachers can add custom items not in the default inventory; these attach to the student's list only, not the global inventory

#### ASM-10 — Sensory Time Engagement Assessment
**Priority:** P0 | **Source:** FR-051a–f, Section 3.3.5 | **Screen:** SCR-012A

**Acceptance Criteria**
- Includes all 12 default activities (SEN-001 to SEN-012)
- Records Engagement Level (Independent/Partial/Full Physical Prompt/N-A), Response/Reaction (Enjoyed/Neutral/Refused/Not Observed), and optional remarks per activity
- Displays a summary of counts by engagement level and response type
- Supports save-as-draft and submit-when-complete
- Activity inventory is configurable via Form Builder

#### ASM-11 — Assessment Completion → "Assessment Complete" Status
**Priority:** P0 | **Source:** FR-049–050 | **Depends on:** ASM-03, ASM-05, ASM-06, ASM-08

**Acceptance Criteria**
- All assessment data is stored and linked to the specific student and assessment session
- Completing all three assessment types (Skills, Behavior, Preference) marks student status "Assessment Complete," ready for IUP

#### ASM-12 — Assessment Form Configuration Wiring
**Priority:** P1 | **Source:** FR-051 (general) | **Depends on:** ADM-02

**Acceptance Criteria**
- Institutional Admins can add, remove, reorder, toggle visibility, and relabel assessment form fields via Form Builder

---

## Module 4 — Assessment Review & IUP Generation

*SRS 3.4. Related screens: SCR-PD-001–004, SCR-ADMIN-001.*

#### IUP-01 — Program Director Dashboard
**Priority:** P0 | **Source:** FR-052 | **Screen:** SCR-PD-001

**Acceptance Criteria**
- Displays Students in Assessment, Assessment Complete (Ready for IUP), Active IUP Plans, and Goals Assigned This Month

#### IUP-02 — Assessment Pipeline View
**Priority:** P1 | **Source:** FR-053 | **Depends on:** IUP-01

**Acceptance Criteria**
- Visualizes students moving through the assessment-to-IUP pipeline stage by stage

#### IUP-03 — Assessment Review Screen
**Priority:** P0 | **Source:** FR-054–055 | **Screen:** SCR-PD-002

**Acceptance Criteria**
- Lists all students with assessment data and status (In Progress, Complete, Reviewed)
- Program Director can open the full Assessment Summary Report (SCR-015) for any student, showing Skills, Behavior, and Preference results

#### IUP-04 — Assessment Visual Dashboard
**Priority:** P1 | **Source:** FR-056 | **Depends on:** IUP-03

**Acceptance Criteria**
- Renders a Skills Radar Chart, a Behavior Function Summary (pie or bar), and a Top Preferences list within the assessment report

#### IUP-05 — Mark Assessment "Reviewed"
**Priority:** P0 | **Source:** FR-057 | **Depends on:** IUP-03

**Acceptance Criteria**
- Marking an assessment "Reviewed" updates student status to "Ready for IUP"

#### IUP-06 — IUP Generation: Assessment Summary Panel
**Priority:** P0 | **Source:** FR-058–059 | **Screen:** SCR-PD-003

**Acceptance Criteria**
- IUP Generation screen surfaces the student's 6-week results: strengths, areas of need, behavior functions, top preferences

#### IUP-07 — IUP Goal Assignment
**Priority:** P0 | **Source:** FR-060–062 | **Depends on:** IUP-06, GB-07

**Acceptance Criteria**
- Program Director can assign up to two goals per station (Station 1: Basic Skills, Station 2: Advanced Skills) from the Goal Bank
- A goal can't be assigned to a station not applicable to the student's therapy group
- Goal-specific notes can be added at assignment time

#### IUP-08 — IUP Draft, Preview & Finalization
**Priority:** P0 | **Source:** FR-063–066 | **Depends on:** IUP-07, IUP-10

**Acceptance Criteria**
- IUP can be saved as a draft before finalization
- Full IUP can be previewed before finalizing
- Finalization is blocked unless at least one goal is assigned per applicable station
- Finalizing sets student status to "Active Therapy" and surfaces assigned goals on the Today's Session Dashboard (SCR-002)

#### IUP-09 — IUP Library Management
**Priority:** P0 | **Source:** FR-067–069 | **Screen:** SCR-PD-004

**Acceptance Criteria**
- Lists all IUPs with status Draft, Active, or Archived
- Non-draft IUPs open read-only; draft IUPs are editable
- Archiving requires a confirmation step

#### IUP-10 — Default IUP Template (12 Sections)
**Priority:** P0 | **Source:** FR-070, Sections 3.4.3–3.4.4 | **Depends on:** INFRA-02

Build the full 12-section IUP structure exactly as it mirrors the physical form, with correct read-only vs. modifiable behavior per section.

**Acceptance Criteria**
- All 12 sections present in default order: Student Info, Assessment Summary, Reinforcement Strategies, Consequence Strategies, Family Participation Plan, Behavior Reduction Protocol, Replacement Behavior Goals, Antecedent Manipulations, Crisis Plan, Coordination of Care, Discharge Criteria, Signatures
- Sections 1, 2, and 12 are auto-populated and read-only (not modifiable via Form Builder); all others are modifiable
- Digital signature capture works for both Program Director and Parent, with auto-populated date on signature
- Every field/dropdown default matches the field definitions in Section 3.4.4 exactly

---

## Module 5 — Goal Bank & Clinical Quality Management

*SRS 3.5. Related screens: SCR-PD-005, SCR-PD-006, SCR-PD-008.*

#### GB-01 — Goal Bank Data Model & List View
**Priority:** P0 | **Source:** FR-071

**Acceptance Criteria**
- Each goal stores Goal Name, Domain, Description, Mastery Criteria Template, Suggested Age Range
- Domains are pulled from admin-configurable definitions (SCR-ADMIN-005), not hard-coded

#### GB-02 — Goal Bank Search & Domain Filters
**Priority:** P0 | **Source:** FR-072–073 | **Depends on:** GB-01

**Acceptance Criteria**
- Search works by goal name or keyword
- Domain filter chips narrow the list, combinable with search

#### GB-03 — Add/Edit Goal
**Priority:** P0 | **Source:** FR-074–075 | **Screen:** SCR-PD-006

**Acceptance Criteria**
- Program Directors can add new goals and edit existing goal details

#### GB-04 — Goal Deactivation & Delete Protection
**Priority:** P0 | **Source:** FR-076–077

**Acceptance Criteria**
- Deactivating a goal blocks new assignments but preserves existing student assignments
- Deletion is blocked outright for goals currently assigned to active students

#### GB-05 — Goal Usage Count Display
**Priority:** P1 | **Source:** FR-078 | **Depends on:** GB-01

**Acceptance Criteria**
- Each goal shows how many students are currently assigned to it

#### GB-06 — Standard vs. Task Analysis Goal Types
**Priority:** P0 | **Source:** FR-078a–b | **Depends on:** GB-03

**Acceptance Criteria**
- Program Director can create a Standard Goal (single-step) or a Task Analysis Goal (multi-step)
- Task Analysis creation supports naming the task, adding ordered steps, setting per-step and overall mastery criteria, and uploading a predefined template

#### GB-07 — Student Caseload Management
**Priority:** P0 | **Source:** FR-079–080 | **Screen:** SCR-PD-005

**Acceptance Criteria**
- Shows current goals for a student organized by station, with status (Active/In Progress/Mastered) and progress percentage

#### GB-08 — Goal Assignment, Replacement & Removal
**Priority:** P0 | **Source:** FR-081–083 | **Depends on:** GB-07

**Acceptance Criteria**
- Program Director can assign a goal to an open slot (max 2 per station)
- If all slots are full, the system prompts to replace an existing goal rather than silently failing
- Removing a goal requires confirmation

#### GB-09 — Graph & Chart View
**Priority:** P1 | **Source:** FR-084–085 | **Screen:** SCR-PD-008

**Acceptance Criteria**
- Generates Goal Progress (line), Trial Distribution (bar), Behavior Incident Trends (bar/line), and Assessment Summary (radar) charts
- Program Director can pick date ranges and specific goals to chart

#### GB-10 — Chart Export & Parent Sharing
**Priority:** P1 | **Source:** FR-086–087 | **Depends on:** GB-09, PAR-04

**Acceptance Criteria**
- Charts export as PNG or PDF
- Charts can be shared with parents through the Parent Communication module

---

## Module 6 — Active Therapy Delivery

*SRS 3.6. The core daily-use module. Related screens: SCR-002–005, SCR-ADMIN-002, SCR-ADMIN-003.*

#### ATD-01 — Today's Session Dashboard Shell
**Priority:** P0 | **Source:** FR-088–089 | **Screen:** SCR-002

**Acceptance Criteria**
- Displays the logged-in teacher's assigned station and room
- Shows a countdown timer for time remaining in the current block, with duration pulled from admin config (SCR-ADMIN-004)

#### ATD-02 — Dual Student Cards (Active/Secondary)
**Priority:** P0 | **Source:** FR-090–091 | **Depends on:** ATD-01, SCH-02

**Acceptance Criteria**
- Displays Active and Secondary student cards per the pre-assignment made in Staff Scheduling (SCR-DIR-002)
- Tapping a student's name navigates to their Student Profile (SCR-006A)

#### ATD-03 — Goal Pills & Active-Goal Switching
**Priority:** P0 | **Source:** FR-092 | **Depends on:** ATD-02, IUP-08

**Acceptance Criteria**
- Each card shows two goal pills/tabs for the two goals assigned at that station
- Tapping a pill switches the active goal for logging on that student

#### ATD-04 — Trial Stream Display
**Priority:** P0 | **Source:** FR-093 | **Depends on:** ATD-03

**Acceptance Criteria**
- Shows the last N trial results for the active goal
- N is configurable via SCR-ADMIN-002

#### ATD-05 — Prompt Entry Bar
**Priority:** P0 | **Source:** FR-094 | **Depends on:** ADM-04

**Acceptance Criteria**
- Displays configurable prompt buttons per Admin's Trial Logging Format config, matching the FP/PP/G/+ hierarchy standard by default
- Buttons meet the 44×44px minimum touch target (Section 4.1)

#### ATD-06 — Standard Trial Logging
**Priority:** P0 | **Source:** FR-095 (base case) | **Depends on:** ATD-05, INFRA-03

**Acceptance Criteria**
- Single-step goals log each tap as a trial against the whole goal
- Tap-to-visual-confirmation latency is under 500ms, online or offline (NFR-001)

#### ATD-07 — Task Analysis Trial Logging
**Priority:** P0 | **Source:** FR-095a–f | **Depends on:** ATD-06, GB-06

**Acceptance Criteria**
- Teacher can select the step being worked, choose a prompt level, and mark Success/Fail, logging multiple trials per step per session
- Progress indicator shows per-step independence % and overall % of steps mastered
- Teacher can toggle between Standard Mode and Task Analysis Mode based on goal type
- Total trials, successes, and independence % auto-calculate per step
- Overall goal mastery auto-flags when all steps are mastered
- Default templates (Washing Hands, Toileting–Urination, Toileting–Request, Dressing–Shoes, Dressing–Pants) are pre-loaded and admins can add custom ones

#### ATD-08 — Active/Secondary Student Swap
**Priority:** P0 | **Source:** FR-096 | **Depends on:** ATD-02

**Acceptance Criteria**
- Teacher can swap which student is "Active" via the Secondary student's prompt bar or a dedicated Swap button

#### ATD-09 — Behavior Incident Modal
**Priority:** P0 | **Source:** FR-097–098d, Section 3.6.3 | **Screen:** SCR-003 | **Depends on:** ADM-06

**Acceptance Criteria**
- Captures Behavior Name, auto-populated Behavior Definition, Frequency, Intensity, Category, Date/Time (auto-defaulted), Location, Antecedent, Consequence, and optional Notes
- Selecting a behavior auto-fills its definition from the configured behavior list
- Each incident is saved as a structured record linked to student, session, active goal, and teacher
- New behavior definitions/categories/frequency/intensity/location options can be added via Admin Panel

#### ATD-10 — Goal Mastery Check: Primary Teacher Summary
**Priority:** P0 | **Source:** FR-100–101 | **Screen:** SCR-004

**Acceptance Criteria**
- Shows Teacher A's data confirming 100% independence on the selected goal before verification can begin

#### ATD-11 — Goal Mastery Check: Two-Teacher Verification
**Priority:** P0 | **Source:** FR-102–104 | **Depends on:** ATD-10

**Acceptance Criteria**
- Requires verification from two additional teachers (B and C), auto-populated by the system
- Each verifier enters Outcome (Success/Fail), Prompt Used (required if Fail), and Notes
- "Submit for Review" stays disabled until both B and C have entered an outcome

#### ATD-12 — Mastery Approval Routing & Decision Handling
**Priority:** P0 | **Source:** FR-105, FR-105a–e | **Depends on:** ATD-11

**Acceptance Criteria**
- Successful two-teacher verification sets goal status to "Pending Approval" and routes to the configured approver (Program Director or Director, per Admin config)
- Approver is notified in-app (and optionally by email) and can review full goal/trial/verification history before deciding
- Rejection reverts status to "Active – In Progress," notifies Teacher A with a reason, and allows resubmission
- Approval sets status to "Mastered," archives the goal, notifies all three teachers plus the Therapy Coordinator, and records approver and date

#### ATD-13 — Session Summary: Overview & Goal Cards
**Priority:** P0 | **Source:** FR-106–108 | **Screen:** SCR-005

**Acceptance Criteria**
- Shows station, teacher name, start time, end time, total duration for the block
- Expandable cards for Student A and B show, per goal: Goal Name, Total Trials, Prompt-Level Breakdown, Independence %

#### ATD-14 — Trial Log Modal & Incident Recap
**Priority:** P0 | **Source:** FR-109–110 | **Depends on:** ATD-13

**Acceptance Criteria**
- "View Trial Log" opens a chronological modal of all trials for the selected goal
- A condensed behavior-incident list appears with a link through to full ABC details

#### ATD-15 — Session Notes, Draft Save & Submit
**Priority:** P0 | **Source:** FR-111–113 | **Depends on:** ATD-13

**Acceptance Criteria**
- Multi-line "Teacher Qualitative Notes" field is available
- "Save Draft" persists without ending the session
- "Submit & End Session" finalizes the session and routes the report to the Therapy Coordinator for review

#### ATD-16 — Session Summary PDF Preview
**Priority:** P0 | **Source:** FR-114 | **Depends on:** ATD-15, INFRA-05

**Acceptance Criteria**
- "Preview PDF" generates a read-only PDF of the session report before submission
- Generation completes within 5 seconds (NFR-004)

---

## Module 7 — Staff Scheduling & Operational Management

*SRS 3.7. Related screens: SCR-DIR-002, SCR-TC-005, SCR-ADMIN-004.*

#### SCH-01 — Staff Scheduling Calendar/Grid View
**Priority:** P0 | **Source:** FR-115–116 | **Screen:** SCR-DIR-002

**Acceptance Criteria**
- Director can view teacher schedules in a calendar/grid layout showing days, session blocks, stations, and assigned students

#### SCH-02 — Teacher-Student Assignment & Capacity Enforcement
**Priority:** P0 | **Source:** FR-117–119 | **Depends on:** SCH-01, ADM-07

**Acceptance Criteria**
- Director can add, edit, and remove teacher-student assignments for a session block
- Assignment is blocked once a teacher's capacity limit (from SCR-ADMIN-004) is reached
- A capacity indicator shows current count vs. limit per teacher

#### SCH-03 — Double-Booking Conflict Detection
**Priority:** P0 | **Source:** FR-120 | **Depends on:** SCH-02

**Acceptance Criteria**
- System blocks assigning the same student to two teachers in the same session block, with a clear conflict message

#### SCH-04 — Operational Management Screen
**Priority:** P0 | **Source:** FR-121 | **Screen:** SCR-TC-005

**Acceptance Criteria**
- Therapy Coordinators can view and manage teacher schedules and staff availability from this screen

#### SCH-05 — Teacher Unavailability & Reassignment
**Priority:** P0 | **Source:** FR-122–123 | **Depends on:** SCH-04

**Acceptance Criteria**
- Coordinator can mark a teacher unavailable for specific dates/blocks with an optional reason
- Students can be reassigned to an available teacher, still subject to capacity rules (SCH-02)

#### SCH-06 — Teacher Performance Metrics Panel
**Priority:** P1 | **Source:** FR-124 | **Depends on:** ATD-15, RPT-01

**Acceptance Criteria**
- Displays Sessions Completed, Average Trials Logged per Session, Average Student Independence %, Incident Rate, and Review Status per teacher

#### SCH-07 — Unassigned-Student Alert
**Priority:** P0 | **Source:** FR-125 | **Depends on:** SCH-02

**Acceptance Criteria**
- A visible warning flags any student without a teacher assignment for the current or upcoming session block

---

## Module 8 — Reporting & Oversight

*SRS 3.8. Related screens: SCR-DIR-005, SCR-DIR-006, SCR-015.*

#### RPT-01 — Reports & Oversight Shell
**Priority:** P0 | **Source:** FR-126–127 | **Screen:** SCR-DIR-005

**Acceptance Criteria**
- Provides four report categories: Session Reports, Bi-Annual Reports, Student Progress, Foundation Overview

#### RPT-02 — Report Filtering
**Priority:** P0 | **Source:** FR-128 | **Depends on:** RPT-01

**Acceptance Criteria**
- Reports can be filtered by Student, Teacher, Station, and Date Range, in combination

#### RPT-03 — Session Reports Table
**Priority:** P0 | **Source:** FR-129 | **Depends on:** RPT-02, ATD-15

**Acceptance Criteria**
- All submitted session summaries appear in a sortable, filterable table

#### RPT-04 — Bi-Annual Report Generation
**Priority:** P0 | **Source:** FR-130 | **Depends on:** RPT-03

**Acceptance Criteria**
- Generates bi-annual progress reports per student
- Validates sufficient underlying data exists before allowing generation
- Completes within 15 seconds for a student with a full year of session data (NFR-004)

#### RPT-05 — Foundation Overview Dashboard
**Priority:** P1 | **Source:** FR-131 | **Depends on:** RPT-01

**Acceptance Criteria**
- Shows Total Active Students, Goals Mastered This Month, Behavior Incident Trends, Teacher Performance, Program Distribution

#### RPT-06 — Report Export & Parent Email
**Priority:** P0 | **Source:** FR-132–133 | **Depends on:** RPT-01, PAR-04

**Acceptance Criteria**
- Reports export as PDF, and optionally CSV
- Directors can email reports directly to parents via the Parent Communication module

#### RPT-07 — Student Progress Monitoring
**Priority:** P0 | **Source:** FR-134–136 | **Screen:** SCR-DIR-006

**Acceptance Criteria**
- Shows Assessment Summary, Current Goals with Progress, Session History, Behavior Incident Trends, and Goal Progress Charts for a student
- Directors can add internal notes not visible to parents or teachers
- Generates a comprehensive Student Progress Report PDF suitable for parent meetings

---

## Module 9 — System Administration & Configuration

*SRS 3.9. Related screens: SCR-ADMIN-000–005. This module is a dependency for many earlier modules (ENR-11, ASM-12, ATD-05, ATD-09, SCH-02) — build the core pieces (ADM-01, ADM-02, ADM-04, ADM-06, ADM-07) early even though it's numbered last in the SRS.*

#### ADM-01 — Administration Panel Shell
**Priority:** P0 | **Source:** FR-137 | **Screen:** SCR-ADMIN-000

**Acceptance Criteria**
- Provides two tabs: Clinical Configuration (Institutional Admin) and System Configuration (System Admin)
- Each tab only exposes the config sections relevant to that admin type

#### ADM-02 — Form Builder Core
**Priority:** P0 | **Source:** FR-138–139d | **Screen:** SCR-ADMIN-001

**Acceptance Criteria**
- Configures fields for Enrollment, IUP, and ABLLS Assessment forms
- Supports uploading JSON/XML templates, toggling fields, editing labels, adding custom fields (Text/Number/Date/Dropdown/Checkbox/Radio/Text Area/File Upload), and drag-and-drop reordering
- Supports form metadata config (Form ID, Name, Revision Number/Date, Organization Name)
- Auto-calculates and displays "Page X of Y" on multi-page forms
- IUP default configuration exactly mirrors the physical IUP document out of the box

#### ADM-03 — Form Builder: Preview & Reset
**Priority:** P1 | **Source:** FR-140–141 | **Depends on:** ADM-02

**Acceptance Criteria**
- Admins can preview a form before saving changes
- Forms can be reset to default configuration, with a confirmation prompt

#### ADM-04 — Trial Logging Format Configuration
**Priority:** P0 | **Source:** FR-142–144 | **Screen:** SCR-ADMIN-002

**Acceptance Criteria**
- Admins configure prompt level labels, colors, order, and active status
- Custom prompt levels can be added, each requiring a unique label
- Prompt levels can be deleted, with confirmation required

#### ADM-05 — Trial Stream & Mastery Criteria Configuration
**Priority:** P1 | **Source:** FR-145–146 | **Depends on:** ADM-04

**Acceptance Criteria**
- Trial Stream layout is configurable (Horizontal, Vertical, Card Grid) with a count range of 3–20
- Mastery Criteria config supports Consecutive Trials Requirement, Percentage Threshold, and an Automatic Suggestion toggle

#### ADM-06 — ABC Dropdown List Manager
**Priority:** P0 | **Source:** FR-147–149 | **Screen:** SCR-ADMIN-003

**Acceptance Criteria**
- Admins manage Antecedent, Behavior, and Consequence dropdown options: add, edit, delete, reorder, toggle active
- Any option can be designated "Other," which opens a free-text field when selected

#### ADM-07 — Session Schedule & Capacity Configuration
**Priority:** P0 | **Source:** FR-150–152 | **Screen:** SCR-ADMIN-004

**Acceptance Criteria**
- Configures Morning/Afternoon Round Start/End Times, Pre-Therapy Duration, Station 1/2 Duration, Staff-to-Student Capacity, Draft Expiry Period
- Validates that every configured end time is later than its start time
- Supports defining custom session blocks beyond the default morning/afternoon rounds

#### ADM-08 — Goal Domain Definitions
**Priority:** P1 | **Source:** FR-153–155 | **Screen:** SCR-ADMIN-005

**Acceptance Criteria**
- Admins manage goal domains (Name, Description, Order, Status)
- Domains can be added and deleted, with confirmation required
- Deletion is blocked for domains currently referenced by existing goals

#### ADM-09 — Configuration Audit Log & PDF Metadata Headers
**Priority:** P1 | **Source:** FR-156, FR-156a

**Acceptance Criteria**
- Every configuration change logs who made it, what changed, and when
- All PDF exports (session summaries, assessment reports, IUP documents) show Form ID, Revision, and Page Number in the header, mirroring the physical forms

---

## Module 10 — Parent Portal & Communication ⚠️ Inferred

*Listed in Section 4.1's screen inventory (SCR-PAR-001–004, plus role-specific communication views: SCR-TEA-005, SCR-TC-006, SCR-PD-007, SCR-DIR-004) and named as a core MVP technical requirement in Section 1.4 ("Digital Parent Communication... within the MVP"). However, Section 3 has no dedicated numbered sub-section or FR-IDs for it — the FR sequence jumps from Module 9 straight to external interfaces. These tasks are my best reconstruction from the screen inventory and scope statement, not from explicit requirements. Flag this with the Melue stakeholders before sprint planning — see Gaps section below.**

#### PAR-01 — Parent Dashboard
**Priority:** P1 | **Source:** ⚠️ Inferred, Section 4.1 (SCR-PAR-001), Section 1.4 scope

**Acceptance Criteria**
- Parent sees a summary view of their child's progress on login
- Navigation to Child Progress, Home Observation Log, and Communication sub-screens

#### PAR-02 — Child Progress View
**Priority:** P1 | **Source:** ⚠️ Inferred, Section 4.1 (SCR-PAR-002) | **Depends on:** GB-10

**Acceptance Criteria**
- Parent can view goal achievements and any charts explicitly shared by a therapist/coordinator (GB-10)
- No access to internal clinical notes (Directors' internal notes stay hidden per FR-135's intent)

#### PAR-03 — Home Observation Log
**Priority:** P1 | **Source:** ⚠️ Inferred, Section 4.1 (SCR-PAR-003), Section 2.2 (Parent responsibilities)

**Acceptance Criteria**
- Parent can record home-based observations and behavior updates
- Entries are timestamped and attributed to the submitting parent/guardian

#### PAR-04 — Parent-Teacher Communication Thread
**Priority:** P1 | **Source:** ⚠️ Inferred, Section 4.1 (SCR-PAR-004, SCR-TEA-005, SCR-TC-006, SCR-PD-007, SCR-DIR-004)

**Acceptance Criteria**
- Teachers, Coordinators, Program Directors, and Directors can message a student's parent from their respective role views
- Parents can reply from SCR-PAR-004
- Messages trigger a push/email notification per the notification rules in Section 4.3

---

## Module 11 — Cross-Cutting: Interfaces, Security, Performance & Compliance

*SRS Sections 4, 5, 6. These aren't a single "module" in the product sense, but each is independently schedulable hardening work that spans multiple feature modules.*

#### NFR-01 — Hardware Interface Integration
**Priority:** P0 | **Source:** Section 4.2

**Acceptance Criteria**
- Camera interface supports photo capture (min 640×480) and video recording (min 480p), feeding ENR-06 and ATD modules
- Local storage interface supports full CRUD for session/trial/incident/assessment data offline (feeds INFRA-03)
- File system interface supports PDF/JPEG/PNG/DOC/DOCX uploads with type/size validation (feeds ENR-05)
- PDF viewer interface supports zoom, pan, print for report previews
- System clock interface handles time zones and DST correctly for timers and timestamps

#### NFR-02 — Security Baseline (Encryption, Hashing, Rate Limiting)
**Priority:** P0 | **Source:** NFR-009–011, NFR-019 | **Depends on:** INFRA-04, INFRA-05

**Acceptance Criteria**
- All tablet-stored data encrypted at rest with AES-256
- All network traffic uses TLS 1.2+; plain HTTP is rejected
- Passwords hashed with bcrypt (cost ≥12) or Argon2, unique salt per user, never stored in plaintext
- Accounts lock for 15 minutes after 5 failed login attempts

#### NFR-03 — Sensitive Data Access Control & Audit Logging
**Priority:** P0 | **Source:** NFR-012–014 | **Depends on:** INFRA-04

**Acceptance Criteria**
- RBAC enforced at UI and API for every request, no exceptions
- Teachers can view student names/goals but not medical diagnoses; Directors/Coordinators/Program Directors have progressively broader access
- Every access to PII/medical/photo/video data logs User ID, timestamp, action, and record accessed
- Audit logs retained a minimum of 7 years and are never auto-purged

#### NFR-04 — Performance Targets Verification
**Priority:** P0 | **Source:** NFR-001–008 | **Depends on:** ATD-06, INFRA-03

**Acceptance Criteria**
- Trial logging latency < 500ms regardless of connectivity
- Local queries (student/trial/session data) execute < 100ms on-device at 500 students / 100,000 trials
- Backend sync responds < 2s at 50 concurrent users; full-day batch sync (~500 trials) completes < 5s
- Web page loads < 3s on standard broadband
- System supports 20 concurrent teacher users, 5 concurrent admin users, 8 concurrent active sessions without degradation

#### NFR-05 — Backup, Disaster Recovery & Data Retention
**Priority:** P1 | **Source:** NFR-018, NFR-020–024, OR-018–022

**Acceptance Criteria**
- Daily incremental and weekly full backups run automatically, stored in a geographically separate location
- Documented DR plan meets RTO ≤ 4 hours, RPO ≤ 1 hour, tested quarterly
- Student records retained ≥5 years post-last-session; inactive records move to cold storage, retrievable within 48 hours on request
- Draft documents auto-purge after 90 days of inactivity, with warnings at days 7/14/30
- Active-student attachments retained indefinitely; archived-student attachments move to cold storage

#### NFR-06 — Accessibility Compliance (WCAG 2.1 AA)
**Priority:** P1 | **Source:** Section 5.3 (Accessibility)

**Acceptance Criteria**
- Web interfaces meet WCAG 2.1 AA: color contrast, keyboard navigation, screen reader support, text scaling
- Tablet interface supports platform accessibility features (VoiceOver, TalkBack)

#### NFR-07 — Legal & Regulatory Compliance (Consent, Access, Erasure)
**Priority:** P0 | **Source:** OR-001–006 | **Depends on:** ENR-03

**Acceptance Criteria**
- Digital parental consent for data collection/use is captured at enrollment and stored permanently
- Authorized staff can export all of a student's data on request (PDF/CSV) to satisfy "Right to Access"
- Authorized staff can permanently delete a student's data on request, with Director confirmation and logging, to satisfy "Right to Erasure"
- A documented DPIA exists prior to production deployment

#### NFR-08 — Training Materials & In-App Help
**Priority:** P1 | **Source:** OR-007–013

**Acceptance Criteria**
- User Manual covers all role-specific workflows
- Quick Start Guide exists for Teachers (Today's Session Dashboard, trial logging, session summary)
- Administrator Guide covers every screen from SCR-ADMIN-000 to SCR-SYS-003
- Parent Guide covers the Parent Dashboard and its sub-screens
- In-app, context-sensitive help is accessible from every screen
- Video tutorials exist for common workflows

#### NFR-09 — Third-Party Licensing & Dependency Hygiene
**Priority:** P2 | **Source:** OR-014–017

**Acceptance Criteria**
- Complete SBOM produced, listing every third-party library/framework/service and its license
- Open-source attribution and license-notice obligations are satisfied
- A process exists for periodic dependency vulnerability audits

---

## Gaps & Judgment Calls Identified During Analysis

Flagging these explicitly rather than silently deciding for you:

1. **Parent Communication has no FR-IDs.** Section 1.4 names it as a core MVP requirement and Section 4.1 lists four parent-facing screens plus four role-specific "Parent Communication" views, but Section 3 never gives it a numbered sub-section or FR-xxx range the way every other module gets. Module 10 above is my reconstruction from the screen inventory alone — you'll want the Program Director/clinical team to write real FRs for it (message permissions, retention, moderation, whether it's read-only-share vs. two-way chat) before estimating it seriously.
2. **Mastery approval role is configurable** (FR-105e: Program Director or Director), but the default hasn't been stated. Worth pinning down before ATD-12 is built so the notification routing has a sane default.
3. **Real-time updates (WebSockets/SSE) are explicitly deferred** post-MVP per Section 4.4 — polling is the MVP approach. I did not create tasks for it; it belongs in a future backlog, not this one.
4. **Explicitly Out of Scope per Section 1.4** (and therefore excluded here): predictive analytics/AI goal suggestions, EHR/hospital system integration, biometric/hardware MFA, and automated bulk historical data migration or OCR. If any of these get pulled forward, they'll need their own requirements written first — there's nothing in the SRS to derive tasks from yet.
5. **Module ordering vs. dependency reality:** the SRS presents Admin Configuration (3.9) last, but in practice Form Builder, Trial Logging Format, ABC Dropdowns, and Session Schedule config are dependencies for Enrollment, Assessment, and Active Therapy Delivery. I sequenced Module 0 (Infrastructure) first and noted the specific ADM-xx dependencies inline rather than reordering the whole document, so it still maps cleanly back to the SRS's own section numbers.