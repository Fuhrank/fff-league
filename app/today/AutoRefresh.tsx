'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls the router for fresh data every `intervalMs` so live match scores
 * tick up without the user hitting reload. Only mounts when there's actually
 * a live match — see TodayPage for the conditional render.
 */
export default function AutoRefresh({ intervalMs = 25000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
