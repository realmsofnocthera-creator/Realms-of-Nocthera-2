import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID (CRITICAL)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

/**
 * Criação de conta com e-mail e senha oficial do Firebase Auth.
 * Grava o documento users/{uid} com email e dataCriacao.
 */
export async function signUpWithEmail(email: string, pass: string): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const uid = credential.user.uid;

  try {
    // Grava users/{uid} no Firestore conforme Ordem 2
    await setDoc(doc(db, 'users', uid), {
      email: credential.user.email || email,
      dataCriacao: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Nota: Criação do documento users/{uid} em Firestore:', error);
  }

  return credential;
}

/**
 * Login com e-mail e senha oficial do Firebase Auth.
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserCredential> {
  return await signInWithEmailAndPassword(auth, email, pass);
}

/**
 * Login com Google
 */
export async function loginWithGoogle(): Promise<UserCredential> {
  const credential = await signInWithPopup(auth, googleProvider);
  const uid = credential.user.uid;
  try {
    await setDoc(doc(db, 'users', uid), {
      email: credential.user.email || '',
      dataCriacao: new Date().toISOString(),
    }, { merge: true });
  } catch {
    // Continua
  }
  return credential;
}

// Chave da antiga sessão do login próprio (removido na 0.5-A2); só é limpa no logout
const LEGACY_SESSION_KEY = 'nocthera_auth_session';

/**
 * Logout: revoga as sessões no servidor (o token atual deixa de valer para a API)
 * e depois encerra a sessão do Firebase Auth no navegador.
 */
export async function logoutUser(): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // O signOut abaixo acontece mesmo se a revogação falhar
    }
  }

  try {
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Ignora
  }

  return await signOut(auth);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Valida conexão com Firestore na inicialização
 */
export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
