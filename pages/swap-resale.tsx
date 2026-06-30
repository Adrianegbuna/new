import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SwapResaleRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/swap-sell');
  }, [router]);

  return null;
}
