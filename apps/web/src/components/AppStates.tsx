import { Link } from 'react-router-dom';
import { AlertCircle, ShieldOff } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-2">Page Not Found</p>
      <p className="text-gray-500 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
      >
        Back to Home
      </Link>
    </div>
  );
}

export function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <ShieldOff className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-8">
        You don't have permission to access this page.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
      >
        Back to Home
      </Link>
    </div>
  );
}

export function FullPageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <LoadingSpinner size="lg" />
    </div>
  );
}
