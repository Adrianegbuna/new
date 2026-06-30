import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminCouponsManagementRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?tab=coupons');
  }, [router]);

  return null;
}


