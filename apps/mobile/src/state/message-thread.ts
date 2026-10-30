import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThreadResponse } from '@bc/contract';

import { IS_SERVER, persistStorage } from '@/state/storage';

type ThreadState = {
  hydrated: boolean;
  threadId: string | null;
  token: string | null;
  lastSeenAt: string | null;
  preview: Pick<ThreadResponse, 'status' | 'updatedAt' | 'sujet'> | null;
  setSession: (threadId: string, token: string) => void;
  setPreview: (preview: ThreadState['preview']) => void;
  markSeen: (at: string) => void;
  clear: () => void;
};

export const useMessageThread = create<ThreadState>()(
  persist(
    (set) => ({
      hydrated: false,
      threadId: null,
      token: null,
      lastSeenAt: null,
      preview: null,
      setSession: (threadId, token) => set({ threadId, token }),
      setPreview: (preview) => set({ preview }),
      markSeen: (at) => set({ lastSeenAt: at }),
      clear: () => set({ threadId: null, token: null, lastSeenAt: null, preview: null }),
    }),
    {
      name: 'bc-message-thread',
      version: 1,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: ({ hydrated: _h, setSession: _s, setPreview: _p, markSeen: _m, clear: _c, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useMessageThread.setState({ hydrated: true });
      },
    },
  ),
);
