import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * Inicialização do Firebase Admin SDK usando Application Default Credentials (ADC).
 * O Admin SDK roda com privilégio de servidor e ignora as regras de segurança do Firestore
 * (Security Rules do cliente).
 */
export const adminApp: App = !getApps().length
  ? initializeApp({
      projectId: firebaseConfig.projectId,
    })
  : getApp();

export const adminDb: Firestore = getFirestore(
  adminApp,
  firebaseConfig.firestoreDatabaseId
);
