'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/api';
import type { User, RegisterDto, AuthContextType } from '@/lib/types';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  /**
   * Fetch the current user from the BFF on mount.
   * If the access token is expired, attempt a refresh first.
   */
  const refreshUser = useCallback(async () => {
    try {
      const result = await authApi.getMe();

      if (result.success && result.data) {
        setUser(result.data.user);
        return;
      }

      // Access token might be expired — try refreshing
      if (result.error === 'Not authenticated' || result.error === 'Token expired') {
        const refreshResult = await authApi.refresh();
        if (refreshResult.success) {
          // Retry getMe with new access token
          const retryResult = await authApi.getMe();
          if (retryResult.success && retryResult.data) {
            setUser(retryResult.data.user);
            return;
          }
        }
      }

      // Not authenticated
      setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  // Rehydrate auth state on mount
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  /**
   * Step 1 of auth: request OTP for phone number.
   */
  const login = useCallback(async (phone: string) => {
    const result = await authApi.requestOtp(phone);
    if (!result.success) {
      throw new Error(result.message || 'Failed to send OTP');
    }
  }, []);

  /**
   * Step 2 of auth: verify OTP. Returns the auth response
   * so the caller can check is_new_user and redirect accordingly.
   */
  const verifyOtp = useCallback(
    async (phone: string, otp: string) => {
      const result = await authApi.verifyOtp(phone, otp);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to verify OTP');
      }

      // For new users, store the registration token for use during registration
      if (result.data.is_new_user && result.data.registration_token) {
        sessionStorage.setItem('registration_token', result.data.registration_token);
      }

      // Set user if available (existing incomplete users have a user object)
      if (result.data.user) {
        setUser(result.data.user);
      }

      // Return shape matching AuthResponse (minus tokens, which are in cookies)
      return {
        user: result.data.user,
        tokens: { access_token: '', refresh_token: '' }, // tokens are in httpOnly cookies
        is_new_user: result.data.is_new_user,
      };
    },
    [],
  );

  /**
   * Step 3 (if new user): complete registration.
   * Includes registration_token from sessionStorage if available.
   */
  const register = useCallback(async (data: RegisterDto) => {
    // Include registration_token if available (for truly new users)
    const registrationToken = typeof window !== 'undefined'
      ? sessionStorage.getItem('registration_token')
      : null;

    const payload = registrationToken
      ? { ...data, registration_token: registrationToken }
      : data;

    const result = await authApi.register(payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to register');
    }
    setUser(result.data.user);

    // Clean up
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('registration_token');
    }
  }, []);

  /**
   * Logout: revoke tokens and clear state.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local state even if API call fails
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      login,
      verifyOtp,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, isAuthenticated, login, verifyOtp, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
