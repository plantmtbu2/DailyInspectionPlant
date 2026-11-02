import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
// Request offline access prompt when needed to prolong connection
provider.setCustomParameters({
  prompt: 'select_account',
});

const TOKEN_STORAGE_KEY = 'fleetcheck_google_access_token';
const TOKEN_TIME_KEY = 'fleetcheck_google_token_time';
const USER_EMAIL_KEY = 'fleetcheck_google_user_email';

// In-memory & localStorage access token cache
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
})();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (user.email) {
        localStorage.setItem(USER_EMAIL_KEY, user.email);
      }
      const token = await getAccessToken();
      if (token && onAuthSuccess) {
        onAuthSuccess(user, token);
      }
    } else {
      // NOTE: Do NOT remove TOKEN_STORAGE_KEY here!
      // Firebase onAuthStateChanged fires with null on first tick during page startup
      // Removing token here previously caused the connection to drop on every refresh.
      if (!cachedAccessToken && onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Workspace dari autentikasi');
    }
    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      localStorage.setItem(TOKEN_TIME_KEY, String(Date.now()));
      if (result.user.email) {
        localStorage.setItem(USER_EMAIL_KEY, result.user.email);
      }
    } catch {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      cachedAccessToken = null;
    }
  }
  return cachedAccessToken;
};

export const getStoredUserEmail = (): string | null => {
  try {
    return localStorage.getItem(USER_EMAIL_KEY) || auth.currentUser?.email || null;
  } catch {
    return null;
  }
};

export const isGoogleConnected = (): boolean => {
  return Boolean(cachedAccessToken || localStorage.getItem(TOKEN_STORAGE_KEY));
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TIME_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  } catch {}
};
