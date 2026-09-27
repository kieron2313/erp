import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onIdTokenChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
  authError: string | null;
  clearAuthError: () => void;
  getFreshToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  token: null,
  authError: null,
  clearAuthError: () => {},
  getFreshToken: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  const getFreshToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const freshToken = await auth.currentUser.getIdToken(forceRefresh);
      setToken(freshToken);
      return freshToken;
    } catch (err) {
      console.warn('Failed to retrieve fresh ID token:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // onIdTokenChanged triggers on sign-in, sign-out, AND whenever the token is refreshed
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      if (u) {
        try {
          const t = await u.getIdToken();
          setToken(t);

          // Only perform full server verify if user isn't logged in yet
          const res = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${t}` }
          });
          
          if (res.ok) {
            setUser(u);
            setToken(t);
            setAuthError(null);
          } else {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 403) {
              await auth.signOut();
              setUser(null);
              setToken(null);
              setAuthError(
                errData.error || `Access Denied: The Google account (${u.email}) is not authorized to access this ERP system. Please ask an administrator to add your email.`
              );
            } else if (res.status === 401) {
              // Try force refreshing the token once before signing out
              try {
                const refreshed = await u.getIdToken(true);
                const retryRes = await fetch('/api/auth/verify', {
                  headers: { Authorization: `Bearer ${refreshed}` }
                });
                if (retryRes.ok) {
                  setUser(u);
                  setToken(refreshed);
                  setAuthError(null);
                  return;
                }
              } catch {}
              await auth.signOut();
              setUser(null);
              setToken(null);
              setAuthError(errData.error || 'Authentication verification failed.');
            } else {
              setAuthError(errData.error || 'Authentication server error. Please retry.');
            }
          }
        } catch (error: any) {
          console.error('Auth verification failed', error);
          if (!auth.currentUser) {
            setUser(null);
            setToken(null);
            setAuthError('Unable to connect to verification server. Please try again.');
          }
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Proactive background token refresh every 15 minutes to prevent token expiration
  useEffect(() => {
    const refreshTimer = setInterval(async () => {
      if (auth.currentUser) {
        try {
          const fresh = await auth.currentUser.getIdToken(true);
          setToken(fresh);
        } catch (err) {
          console.warn('Proactive background token refresh failed:', err);
        }
      }
    }, 15 * 60 * 1000);

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        try {
          const fresh = await auth.currentUser.getIdToken();
          setToken(fresh);
        } catch (err) {
          console.warn('Focus token refresh failed:', err);
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Login failed', error);
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        setAuthError(error.message || 'An error occurred during sign in.');
        throw error;
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    setAuthError(null);
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, token, authError, clearAuthError, getFreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
