import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type ScreenModePreference = 'AUTO' | 'MOBILE' | 'TABLET' | 'NOTEBOOK' | 'PC';
export type EffectiveScreenMode = 'mobile' | 'tablet' | 'notebook' | 'pc';

export interface ScreenModeOptionInfo {
  id: ScreenModePreference;
  label: string;
  shortLabel: string;
  description: string;
  resolutionHint: string;
}

export const SCREEN_MODE_OPTIONS: ScreenModeOptionInfo[] = [
  {
    id: 'AUTO',
    label: 'Otomatis (Sesuai Layar)',
    shortLabel: 'Auto',
    description: 'Menyesuaikan otomatis ukuran layar HP, Tablet, Notebook, atau PC',
    resolutionHint: 'Responsif Otomatis',
  },
  {
    id: 'MOBILE',
    label: 'Mode HP (Smartphone)',
    shortLabel: 'HP',
    description: 'Tampilan ringkas 1 kolom dengan navigasi bawah & bar cepat',
    resolutionHint: '< 640px (HP)',
  },
  {
    id: 'TABLET',
    label: 'Mode Tablet',
    shortLabel: 'Tablet',
    description: 'Tampilan 2 kolom proporsional dengan ruang sentuh nyaman',
    resolutionHint: '640px – 1023px',
  },
  {
    id: 'NOTEBOOK',
    label: 'Mode Notebook / Laptop',
    shortLabel: 'Notebook',
    description: 'Sidebar kiri ringkas & area kerja ideal untuk layar laptop 13"–15"',
    resolutionHint: '1024px – 1439px',
  },
  {
    id: 'PC',
    label: 'Mode PC / Monitor Lebar',
    shortLabel: 'PC',
    description: 'Layout penuh multi-kolom dengan tabel & grafik berkapasitas lebar',
    resolutionHint: '≥ 1440px (Desktop)',
  },
];

const STORAGE_KEY = 'plant2_screen_layout_mode_v1';

const detectScreenFromWidth = (width: number): EffectiveScreenMode => {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'notebook';
  return 'pc';
};

export const getScreenModeDisplayName = (mode: EffectiveScreenMode): string => {
  switch (mode) {
    case 'mobile':
      return 'HP';
    case 'tablet':
      return 'Tablet';
    case 'notebook':
      return 'Notebook';
    case 'pc':
      return 'PC';
  }
};

interface ScreenLayoutContextType {
  preference: ScreenModePreference;
  setPreference: (mode: ScreenModePreference) => void;
  detectedMode: EffectiveScreenMode;
  effectiveMode: EffectiveScreenMode;
  viewportWidth: number;
  isCompactNav: boolean; // true for mobile & tablet (uses top quick-bar + bottom nav)
  isDesktopSidebar: boolean; // true for notebook & pc (uses sticky left sidebar)
}

const ScreenLayoutContext = createContext<ScreenLayoutContextType>({
  preference: 'AUTO',
  setPreference: () => {},
  detectedMode: 'notebook',
  effectiveMode: 'notebook',
  viewportWidth: 1280,
  isCompactNav: false,
  isDesktopSidebar: true,
});

export const ScreenLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ScreenModePreference>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ScreenModePreference | null;
      if (saved && ['AUTO', 'MOBILE', 'TABLET', 'NOTEBOOK', 'PC'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'AUTO';
  });

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const detectedMode = useMemo(() => detectScreenFromWidth(viewportWidth), [viewportWidth]);

  const effectiveMode: EffectiveScreenMode = useMemo(() => {
    if (preference === 'MOBILE') return 'mobile';
    if (preference === 'TABLET') return 'tablet';
    if (preference === 'NOTEBOOK') return 'notebook';
    if (preference === 'PC') return 'pc';
    return detectedMode;
  }, [preference, detectedMode]);

  const setPreference = (mode: ScreenModePreference) => {
    setPreferenceState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-screen-pref', preference.toLowerCase());
    root.setAttribute('data-effective-screen', effectiveMode);
  }, [preference, effectiveMode]);

  const isCompactNav = effectiveMode === 'mobile' || effectiveMode === 'tablet';
  const isDesktopSidebar = effectiveMode === 'notebook' || effectiveMode === 'pc';

  return (
    <ScreenLayoutContext.Provider
      value={{
        preference,
        setPreference,
        detectedMode,
        effectiveMode,
        viewportWidth,
        isCompactNav,
        isDesktopSidebar,
      }}
    >
      {children}
    </ScreenLayoutContext.Provider>
  );
};

export const useScreenLayout = () => useContext(ScreenLayoutContext);
