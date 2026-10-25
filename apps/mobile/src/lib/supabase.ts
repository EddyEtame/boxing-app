import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { configReady, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';

/**
 * SecureStore refuse historiquement les valeurs au-dela d'environ 2048 octets.
 * La session Supabase est donc decoupee. Sur le web, localStorage suffit.
 */
const MAX_OCTETS = 1800;

type Magasin = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

function nomCle(key: string, suffix: string): string {
  const base = key.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 160);
  return `${base}.${suffix}`;
}

function morceaux(value: string): string[] {
  const encodeur = new TextEncoder();
  const out: string[] = [];
  let buf = '';
  let taille = 0;
  for (const ch of value) {
    const n = encodeur.encode(ch).length;
    if (buf && taille + n > MAX_OCTETS) {
      out.push(buf);
      buf = ch;
      taille = n;
    } else {
      buf += ch;
      taille += n;
    }
  }
  if (buf) out.push(buf);
  return out;
}

const secureStorage: Magasin = {
  async getItem(key) {
    const brut = await SecureStore.getItemAsync(nomCle(key, 'count'));
    if (brut == null) return null;
    const count = Number(brut);
    if (!Number.isInteger(count) || count < 0) return null;
    let value = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(nomCle(key, String(i)));
      if (part == null) return null;
      value += part;
    }
    return value;
  },
  async setItem(key, value) {
    const parts = morceaux(value);
    const ancien = Number(await SecureStore.getItemAsync(nomCle(key, 'count')));
    for (let i = 0; i < parts.length; i++) {
      await SecureStore.setItemAsync(nomCle(key, String(i)), parts[i], {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
    await SecureStore.setItemAsync(nomCle(key, 'count'), String(parts.length), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    if (Number.isInteger(ancien)) {
      for (let i = parts.length; i < ancien; i++) {
        await SecureStore.deleteItemAsync(nomCle(key, String(i)));
      }
    }
  },
  async removeItem(key) {
    const brut = await SecureStore.getItemAsync(nomCle(key, 'count'));
    const count = Number(brut);
    if (Number.isInteger(count) && count > 0) {
      for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(nomCle(key, String(i)));
    }
    await SecureStore.deleteItemAsync(nomCle(key, 'count'));
  },
};

const webStorage: Magasin = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient | null = configReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: Platform.OS === 'web' ? webStorage : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  const suivre = (state: AppStateStatus) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };
  AppState.addEventListener('change', suivre);
  if (AppState.currentState === 'active') suivre('active');
  else if (AppState.currentState) suivre('background');
}
