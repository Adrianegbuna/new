import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';

interface ProtectAdminPageProps {
  children?: React.ReactNode;
  requiredRole?: 'admin' | 'vendor' | 'customer' | 'installer';
}

export function ProtectAdminPage({ children, requiredRole = 'admin' }: ProtectAdminPageProps) {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Use a higher delay to ensure Zustand has fully hydrated from localStorage
    const timer = setTimeout(() => {
      // Try to get auth from store
      let userToCheck = user;
      let tokenToCheck = token;
      let authToCheck = isAuthenticated;

      // If store shows no auth, check localStorage directly
      if (!authToCheck && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('auth-store');
          if (stored) {
            const authData = JSON.parse(stored);
            userToCheck = authData.state?.user || null;
            tokenToCheck = authData.state?.token || null;
            authToCheck = !!tokenToCheck;
          }
        } catch (e) {
          // Silent fail on localStorage parse error
        }
      }

      if (!authToCheck || !tokenToCheck) {
        router.replace('/login');
        return;
      }

      const normalizedRole = String(userToCheck?.role || '').toLowerCase();
      const normalizedAccountType = String(userToCheck?.accountType || '').toLowerCase();
      const adminLevel = String(userToCheck?.adminLevel || '').toUpperCase();
      const isAdminLike =
        normalizedRole === 'admin' ||
        normalizedAccountType === 'admin' ||
        adminLevel.startsWith('SA');

      const hasRequiredRole = requiredRole === 'admin'
        ? isAdminLike
        : normalizedRole === requiredRole;

      if (!hasRequiredRole) {
        router.replace('/account');
        return;
      }

      setIsAuthorized(true);
      setIsChecking(false);
    }, 100); // Increased delay to 100ms to ensure localStorage is accessible

    return () => clearTimeout(timer);
  }, [isAuthenticated, token, user, router, requiredRole]);

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
          <p className="mt-4 text-gray-900 font-semibold">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectAdminPage;
