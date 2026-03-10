'use client';

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/lib/types';

/**
 * Hook to access the auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
