import React, { createContext, useContext, useState } from 'react';
import { UserRole, AuthUser } from '../types';
import { recordUserActivity } from '../services/userActivityLogService';

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

const generateSessionId = () =>
  `SES-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

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

  const login = (
    role: UserRole,
    password?: string,
    operatorName?: string,
    isSwitch?: boolean
  ): { success: boolean; error?: string } => {
    const cleanName = (operatorName || '').trim();

    if (role === 'admin') {
      if (!cleanName) {
        return { success: false, error: 'Nama Admin wajib diisi!' };
      }
      const currentAdminPass = getAdminPassword();
      const enteredPass = password?.trim() || '';
      if (!enteredPass) {
        return { success: false, error: 'Password Admin tidak boleh kosong.' };
      }
      if (enteredPass !== currentAdminPass) {
        return { success: false, error: 'Password Admin salah! Silakan periksa kembali.' };
      }

      if (isSwitch && currentUser) {
        recordUserActivity({
          userName: currentUser.displayName,
          role: currentUser.role,
          sessionId: currentUser.sessionId || `SES-${currentUser.loginTime}`,
          actionType: 'SWITCH_PROFILE',
          module: 'Autentikasi',
          description: `Beralih profil dari ${currentUser.role.toUpperCase()} (${currentUser.displayName}) ke ADMIN (${cleanName})`,
        });
      }

      const sessionId = generateSessionId();
      const user: AuthUser = {
        role: 'admin',
        username: cleanName.toLowerCase().replace(/\s+/g, '_'),
        displayName: cleanName,
        loginTime: new Date().toISOString(),
        sessionId,
      };
      setCurrentUser(user);
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      } catch {}

      recordUserActivity({
        userName: cleanName,
        role: 'admin',
        sessionId,
        actionType: 'LOGIN',
        module: 'Autentikasi',
        description: isSwitch
          ? `Login masuk sebagai ADMIN (${cleanName}) via ganti profil`
          : `Login masuk sebagai ADMIN (${cleanName})`,
      });

      return { success: true };
    } else {
      if (!cleanName) {
        return { success: false, error: 'Nama User / Mekanik wajib diisi!' };
      }

      if (isSwitch && currentUser) {
        recordUserActivity({
          userName: currentUser.displayName,
          role: currentUser.role,
          sessionId: currentUser.sessionId || `SES-${currentUser.loginTime}`,
          actionType: 'SWITCH_PROFILE',
          module: 'Autentikasi',
          description: `Beralih profil dari ${currentUser.role.toUpperCase()} (${currentUser.displayName}) ke USER (${cleanName})`,
        });
      }

      const sessionId = generateSessionId();
      const user: AuthUser = {
        role: 'user',
        username: cleanName.toLowerCase().replace(/\s+/g, '_'),
        displayName: cleanName,
        loginTime: new Date().toISOString(),
        sessionId,
      };
      setCurrentUser(user);
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      } catch {}

      recordUserActivity({
        userName: cleanName,
        role: 'user',
        sessionId,
        actionType: 'LOGIN',
        module: 'Autentikasi',
        description: isSwitch
          ? `Login masuk sebagai USER (${cleanName}) via ganti profil`
          : `Login masuk sebagai USER (${cleanName})`,
      });

      return { success: true };
    }
  };

  const logout = () => {
    if (currentUser) {
      recordUserActivity({
        userName: currentUser.displayName,
        role: currentUser.role,
        sessionId: currentUser.sessionId || `SES-${currentUser.loginTime}`,
        actionType: 'LOGOUT',
        module: 'Autentikasi',
        description: `Logout keluar dari sistem (${currentUser.role.toUpperCase()}: ${currentUser.displayName})`,
      });
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {}
  };

  const switchProfile = (role: UserRole, password?: string, operatorName?: string): { success: boolean; error?: string } => {
    return login(role, password, operatorName, true);
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
