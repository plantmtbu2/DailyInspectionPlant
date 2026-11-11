import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AuthUser } from '../types';

interface AuthContextType {
  currentUser: AuthUser | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (role: UserRole, password?: string, operatorName?: string) => { success: boolean; error?: string };
  logout: () => void;
  switchProfile: (role: UserRole, password?: string, operatorName?: string) => { success: boolean; error?: string };
  changeAdminPassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };
  resetAdminPassword: () => void;
}

const AUTH_SESSION_KEY = 'fleetcheck_auth_session';
const ADMIN_PASS_KEY = 'fleetcheck_admin_pass';
const DEFAULT_ADMIN_PASSWORD = 'mtbu2026';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'user')) {
          return parsed as AuthUser;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved auth session:', e);
    }
    return null;
  });

  const getAdminPassword = (): string => {
    try {
      const saved = localStorage.getItem(ADMIN_PASS_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch {}
    return DEFAULT_ADMIN_PASSWORD;
  };

  const login = (role: UserRole, password?: string, operatorName?: string): { success: boolean; error?: string } => {
    if (role === 'admin') {
      const currentAdminPass = getAdminPassword();
      const enteredPass = password?.trim() || '';
      if (!enteredPass) {
        return { success: false, error: 'Password Admin tidak boleh kosong.' };
      }
      if (enteredPass !== currentAdminPass) {
        return { success: false, error: 'Password Admin salah! Silakan periksa kembali.' };
      }

      const user: AuthUser = {
        role: 'admin',
        username: 'admin',
        displayName: 'Administrator MTBU',
        loginTime: new Date().toISOString(),
      };
      setCurrentUser(user);
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      } catch {}
      return { success: true };
    } else {
      // Role: User / Operator
      const cleanName = operatorName?.trim() || 'User Operasional';
      const user: AuthUser = {
        role: 'user',
        username: 'operator',
        displayName: cleanName,
        loginTime: new Date().toISOString(),
      };
      setCurrentUser(user);
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      } catch {}
      return { success: true };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {}
  };

  const switchProfile = (role: UserRole, password?: string, operatorName?: string): { success: boolean; error?: string } => {
    return login(role, password, operatorName);
  };

  const changeAdminPassword = (oldPass: string, newPass: string): { success: boolean; error?: string } => {
    const currentPass = getAdminPassword();
    if (oldPass.trim() !== currentPass) {
      return { success: false, error: 'Password lama salah.' };
    }
    if (!newPass.trim() || newPass.trim().length < 4) {
      return { success: false, error: 'Password baru minimal 4 karakter.' };
    }
    try {
      localStorage.setItem(ADMIN_PASS_KEY, newPass.trim());
      return { success: true };
    } catch {
      return { success: false, error: 'Gagal menyimpan password baru.' };
    }
  };

  const resetAdminPassword = () => {
    try {
      localStorage.removeItem(ADMIN_PASS_KEY);
    } catch {}
  };

  const isAdmin = currentUser?.role === 'admin';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isAuthenticated,
        login,
        logout,
        switchProfile,
        changeAdminPassword,
        resetAdminPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
