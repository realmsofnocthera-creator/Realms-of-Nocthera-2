'use client';

import { useEffect } from 'react';
import { testFirestoreConnection } from '@/lib/firebase';

export function FirebaseInit() {
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  return null;
}
