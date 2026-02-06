'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  phone_number: string;
  display_name: string | null;
  is_verified: boolean;
  is_admin: boolean;
  verification_status: string;
  language_preference: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'sahovat_tokens';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

function getStoredTokens(): StoredTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeTokens(tokens: StoredTokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from stored tokens
  useEffect(() => {
    const initAuth = async () => {
      const tokens = getStoredTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }

      api.setAccessToken(tokens.accessToken);

      // Try to refresh the token to validate session
      const response = await api.refreshToken(tokens.refreshToken);
      if (response.success && response.data) {
        const newTokens = response.data.tokens;
        storeTokens({
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
        });
        api.setAccessToken(newTokens.access_token);

        // Fetch user data using verification status endpoint
        const userResponse = await api.getVerificationStatus();
        if (userResponse.success && userResponse.data) {
          // We need to decode the token to get user info
          // For now, set minimal user data
          const tokenPayload = parseJwt(newTokens.access_token);
          if (tokenPayload) {
            setUser({
              id: tokenPayload.userId,
              phone_number: '',
              display_name: null,
              is_verified: userResponse.data.is_verified,
              is_admin: tokenPayload.isAdmin,
              verification_status: userResponse.data.verification_status,
              language_preference: 'uz',
            });
          }
        }
      } else {
        // Token refresh failed, clear stored tokens
        clearTokens();
        api.setAccessToken(null);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback((userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData);
    storeTokens({ accessToken, refreshToken });
    api.setAccessToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearTokens();
      api.setAccessToken(null);
    }
  }, []);

  const updateUser = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to parse JWT without external library
function parseJwt(token: string): { userId: string; isAdmin: boolean } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
