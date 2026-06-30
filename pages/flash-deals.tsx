import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FlashDealsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/deals');
  }, [router]);

  return null;
}
