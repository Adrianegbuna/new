import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminReturnsManagementRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?tab=returns');
  }, [router]);

  return null;
}


