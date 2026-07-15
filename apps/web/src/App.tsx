import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { GoalsPage } from './pages/GoalsPage';
import { SessionsPage } from './pages/SessionsPage';
import { TrialLoggingPage } from './pages/TrialLoggingPage';
import { AdminPage } from './pages/AdminPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { MessagesPage } from './pages/MessagesPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { IupsPage } from './pages/IupsPage';
import { EnrollmentPage } from './pages/EnrollmentPage';
import { SchedulingPage } from './pages/SchedulingPage';
import { SessionSummaryPage } from './pages/SessionSummaryPage';
import { ParentPortalPage } from './pages/ParentPortalPage';
import { ChartsPage } from './pages/ChartsPage';
import { MasteryCheckPage } from './pages/MasteryCheckPage';
import { OperationalManagementPage } from './pages/OperationalManagementPage';
import { Layout } from './components/Layout';
import { NotFoundPage, AccessDeniedPage, FullPageLoadingSpinner } from './components/AppStates';

const ROLE_ROUTES: Record<string, string[]> = {
  'Teacher': [
    '/',
    '/sessions',
    '/sessions/log',
    '/sessions/summary',
    '/students',
    '/students/:id',
    '/goals',
    '/mastery',
    '/reports',
    '/messages',
    '/charts',
  ],
  'Therapy Coordinator': [
    '/',
    '/scheduling',
    '/scheduling/operations',
    '/sessions',
    '/sessions/log',
    '/sessions/summary',
    '/students',
    '/students/:id',
    '/goals',
    '/mastery',
    '/reports',
    '/messages',
    '/charts',
    '/assessments',
    '/iups',
  ],
  'Program Director': [
    '/',
    '/iups',
    '/goals',
    '/students',
    '/students/:id',
    '/assessments',
    '/reports',
    '/charts',
    '/messages',
    '/sessions',
    '/mastery',
  ],
  'System Administrator': [
    '/',
    '/admin',
    '/admin/users',
    '/admin/roles',
    '/users',
    '/reports',
    '/messages',
  ],
  'Institutional Administrator': [
    '/',
    '/admin',
    '/admin/users',
    '/admin/roles',
    '/users',
    '/reports',
    '/messages',
  ],
  'Director': [
    '/',
    '/reports',
    '/charts',
    '/students',
    '/students/:id',
    '/iups',
    '/goals',
    '/sessions',
    '/messages',
    '/mastery',
    '/assessments',
    '/scheduling',
    '/scheduling/operations',
    '/enrollment',
  ],
  'Parent': [
    '/',
    '/parent',
  ],
};

function hasRouteAccess(pathname: string, userRoles: string[]): boolean {
  for (const role of userRoles) {
    const allowedRoutes = ROLE_ROUTES[role];
    if (!allowedRoutes) continue;

    for (const route of allowedRoutes) {
      if (route === pathname) return true;

      if (route.includes(':id')) {
        const routePattern = route.replace(':id', '[^/]+');
        const regex = new RegExp(`^${routePattern}$`);
        if (regex.test(pathname)) return true;
      }

      if (pathname.startsWith(route + '/')) return true;
    }
  }
  return false;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRouteAccess(location.pathname, user.roles)) {
    return <AccessDeniedPage />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <StudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id"
        element={
          <ProtectedRoute>
            <StudentProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <GoalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <SessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/log"
        element={
          <ProtectedRoute>
            <TrialLoggingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute>
            <RolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments"
        element={
          <ProtectedRoute>
            <AssessmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/iups"
        element={
          <ProtectedRoute>
            <IupsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enrollment"
        element={
          <ProtectedRoute>
            <EnrollmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scheduling"
        element={
          <ProtectedRoute>
            <SchedulingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scheduling/operations"
        element={
          <ProtectedRoute>
            <OperationalManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/summary"
        element={
          <ProtectedRoute>
            <SessionSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent"
        element={
          <ProtectedRoute>
            <ParentPortalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/charts"
        element={
          <ProtectedRoute>
            <ChartsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mastery"
        element={
          <ProtectedRoute>
            <MasteryCheckPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
