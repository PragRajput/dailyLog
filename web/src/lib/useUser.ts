'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { User } from './types';

export function useUser() {
  const router = useRouter();

  const { data: user, isLoading: loading } = useQuery<User | null>({
    queryKey: ['me'],
    queryFn:  api.me,
    staleTime: 5 * 60 * 1000, // cache user for 5 minutes
    retry: false,
  });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  return { user: user ?? null, loading };
}
