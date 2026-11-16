import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppSettings,
  AppModuleId,
  ModuleControlConfig,
  getAppSettings,
  saveAppSettings,
  resetAppSettings,
  subscribeAppSettings,
  APP_MODULE_ORDER,
} from '../services/settingsService';

export interface ModulePermission {
  canAccess: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  label: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updater: AppSettings | ((prev: AppSettings) => AppSettings)) => AppSettings;
  updateModuleConfig: (moduleId: AppModuleId, patch: Partial<ModuleControlConfig>) => AppSettings;
  resetAllSettings: () => AppSettings;
  canAccessModule: (tab: string, isAdmin: boolean) => boolean;
  getModulePermission: (tab: AppModuleId, isAdmin: boolean) => ModulePermission;
  getFirstAccessibleModule: (isAdmin: boolean) => AppModuleId;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());

  useEffect(() => {
    return subscribeAppSettings(next => {
      setSettings(next);
    });
  }, []);

  const updateSettings = useCallback(
    (updater: AppSettings | ((prev: AppSettings) => AppSettings)): AppSettings => {
      const current = getAppSettings();
      const next = typeof updater === 'function' ? updater(current) : updater;
      const saved = saveAppSettings(next);
      setSettings(saved);
      return saved;
    },
    []
  );

  const updateModuleConfig = useCallback(
    (moduleId: AppModuleId, patch: Partial<ModuleControlConfig>): AppSettings => {
      return updateSettings(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [moduleId]: {
            ...prev.modules[moduleId],
            ...patch,
          },
        },
      }));
    },
    [updateSettings]
  );

  const resetAllSettings = useCallback((): AppSettings => {
    const defaults = resetAppSettings();
    setSettings(defaults);
    return defaults;
  }, []);

  const canAccessModule = useCallback(
    (tab: string, isAdmin: boolean): boolean => {
      if (tab === 'settings') {
        return isAdmin;
      }
      if (isAdmin) {
        return true;
      }
      const mod = settings.modules[tab as AppModuleId];
      return mod ? mod.enabled !== false : true;
    },
    [settings.modules]
  );

  const getModulePermission = useCallback(
    (tab: AppModuleId, isAdmin: boolean): ModulePermission => {
      const mod = settings.modules[tab];
      if (isAdmin) {
        return {
          canAccess: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canExport: true,
          label: mod?.label || tab,
        };
      }
      return {
        canAccess: mod ? mod.enabled !== false : true,
        canCreate: mod ? mod.enabled !== false && mod.userCanCreate !== false : true,
        canEdit: mod ? mod.enabled !== false && mod.userCanEdit !== false : true,
        canDelete: mod ? mod.enabled !== false && mod.userCanDelete !== false : true,
        canExport: mod ? mod.enabled !== false && mod.userCanExport !== false : true,
        label: mod?.label || tab,
      };
    },
    [settings.modules]
  );

  const getFirstAccessibleModule = useCallback(
    (isAdmin: boolean): AppModuleId => {
      const preferred = settings.general.defaultLandingTab;
      if (canAccessModule(preferred, isAdmin)) {
        return preferred;
      }
      const firstEnabled = APP_MODULE_ORDER.find(id => canAccessModule(id, isAdmin));
      return firstEnabled || 'dashboard';
    },
    [settings.general.defaultLandingTab, canAccessModule]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateModuleConfig,
        resetAllSettings,
        canAccessModule,
        getModulePermission,
        getFirstAccessibleModule,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useAuth/useSettings must be used within a SettingsProvider');
  }
  return ctx;
};
