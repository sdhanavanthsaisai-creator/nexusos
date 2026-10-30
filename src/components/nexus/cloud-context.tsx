'use client';

import { createContext, useContext } from 'react';

export type CloudSyncState = 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

export const CloudSyncContext = createContext<CloudSyncState>('connecting');

export function useCloudSyncState() {
  return useContext(CloudSyncContext);
}
