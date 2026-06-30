import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminInventoryManagementRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?tab=products');
  }, [router]);

  return null;
}


