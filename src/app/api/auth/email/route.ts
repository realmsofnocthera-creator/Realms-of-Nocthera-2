import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { createSignedSessionToken } from '@/server/auth';

interface StoredUserRecord {
  uid: string;
  email: string;
  passwordHash: string;
  dataCriacao: string;
}

const memoryUsers = new Map<string, StoredUserRecord>();

function deriveUidFromEmail(email: string): string {
  const hash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `usr_${hash.slice(0, 24)}`;
}

function hashPassword(password: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return `${actualSalt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const candidate = hashPassword(password, salt);
  const candidateBuf = Buffer.from(candidate);
  const storedBuf = Buffer.from(storedHash);
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

async function getUserRecord(uid: string): Promise<StoredUserRecord | null> {
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    if (snap.exists) {
      const data = snap.data();
      if (data && typeof data.email === 'string' && typeof data.passwordHash === 'string') {
        const record: StoredUserRecord = {
          uid,
          email: data.email,
          passwordHash: data.passwordHash,
          dataCriacao:
            typeof data.dataCriacao === 'string' ? data.dataCriacao : new Date().toISOString(),
        };
        memoryUsers.set(uid, record);
        return record;
      }
    }
  } catch {
    // Fallback para memória se necessário
  }
  return memoryUsers.get(uid) || null;
}

async function saveUserRecord(record: StoredUserRecord): Promise<void> {
  memoryUsers.set(record.uid, record);
  try {
    await adminDb.collection('users').doc(record.uid).set(
      {
        email: record.email,
        passwordHash: record.passwordHash,
        dataCriacao: record.dataCriacao,
      },
      { merge: true }
    );
  } catch {
    // Mantém em memória caso o Firestore falhe temporariamente
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body.mode === 'signup' ? 'signup' : 'login';
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(
        { code: 'auth/invalid-email', error: 'Informe um endereço de e-mail válido.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          code: 'auth/weak-password',
          error: 'A senha deve conter no mínimo 6 caracteres.',
        },
        { status: 400 }
      );
    }

    const uid = deriveUidFromEmail(rawEmail);
    const existing = await getUserRecord(uid);

    if (mode === 'signup') {
      if (existing) {
        return NextResponse.json(
          {
            code: 'auth/email-already-in-use',
            error: 'Este e-mail já está em uso. Tente fazer login.',
          },
          { status: 400 }
        );
      }

      const newUser: StoredUserRecord = {
        uid,
        email: rawEmail,
        passwordHash: hashPassword(password),
        dataCriacao: new Date().toISOString(),
      };

      await saveUserRecord(newUser);
      const idToken = createSignedSessionToken({ uid, email: rawEmail });

      return NextResponse.json(
        {
          user: { uid, email: rawEmail },
          idToken,
        },
        { status: 201 }
      );
    } else {
      if (!existing || !verifyPassword(password, existing.passwordHash)) {
        return NextResponse.json(
          {
            code: 'auth/invalid-credential',
            error: 'E-mail ou senha incorretos.',
          },
          { status: 401 }
        );
      }

      const idToken = createSignedSessionToken({ uid: existing.uid, email: existing.email });

      return NextResponse.json(
        {
          user: { uid: existing.uid, email: existing.email },
          idToken,
        },
        { status: 200 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Ocorreu um erro durante a autenticação.' },
      { status: 500 }
    );
  }
}
