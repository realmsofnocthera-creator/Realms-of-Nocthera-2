#!/usr/bin/env node
/**
 * 0.5-A2 — Migra as contas do antigo login próprio (users/{uid}.passwordHash no Firestore)
 * para o Firebase Auth, mantendo o mesmo uid (o personagem continua ligado à conta)
 * e a mesma senha (o hash scrypt é importado, a senha nunca é lida).
 *
 * Uso (com credenciais de administrador do projeto, ex.: `gcloud auth application-default login`):
 *   node scripts/migrar-contas-login-proprio.mjs            # simulação: só lista o que faria
 *   node scripts/migrar-contas-login-proprio.mjs --aplicar  # importa e remove passwordHash
 *
 * O hash antigo era `${saltHex}:${chaveHex}` gerado por crypto.scryptSync(senha, saltHex, 64),
 * com os padrões do Node (N=16384, r=8, p=1). O salt era a string hex usada como texto (UTF-8).
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const config = JSON.parse(
  readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')
);
const aplicar = process.argv.includes('--aplicar');

const app = initializeApp({ projectId: config.projectId });
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

const HASH_OPTIONS = {
  hash: {
    algorithm: 'STANDARD_SCRYPT',
    memoryCost: 16384,
    parallelization: 1,
    blockSize: 8,
    derivedKeyLength: 64,
  },
};

function converterHash(passwordHash) {
  const [saltHex, chaveHex] = String(passwordHash).split(':');
  if (!saltHex || !chaveHex) return null;
  return {
    passwordSalt: Buffer.from(saltHex, 'utf8'),
    passwordHash: Buffer.from(chaveHex, 'hex'),
  };
}

async function main() {
  const snap = await db.collection('users').get();
  const candidatos = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.passwordHash !== 'string') continue;
    const hash = converterHash(data.passwordHash);
    if (!hash || typeof data.email !== 'string') {
      console.warn(`[ignorado] users/${doc.id}: passwordHash ou email em formato inesperado`);
      continue;
    }
    candidatos.push({ uid: doc.id, email: data.email.trim().toLowerCase(), ...hash });
  }

  console.log(`${candidatos.length} conta(s) do login próprio encontrada(s).`);
  if (candidatos.length === 0) return;

  if (!aplicar) {
    for (const c of candidatos) console.log(`  - ${c.uid} <${c.email}>`);
    console.log('Simulação: nada foi alterado. Rode com --aplicar para migrar.');
    return;
  }

  const migrados = [];
  // importUsers aceita até 1000 contas por chamada
  for (let i = 0; i < candidatos.length; i += 1000) {
    const lote = candidatos.slice(i, i + 1000);
    const resultado = await auth.importUsers(
      lote.map((c) => ({
        uid: c.uid,
        email: c.email,
        emailVerified: false,
        passwordHash: c.passwordHash,
        passwordSalt: c.passwordSalt,
      })),
      HASH_OPTIONS
    );
    const falhas = new Set(resultado.errors.map((e) => e.index));
    for (const e of resultado.errors) {
      console.error(`[falha] ${lote[e.index].uid} <${lote[e.index].email}>: ${e.error.message}`);
    }
    lote.forEach((c, idx) => {
      if (!falhas.has(idx)) migrados.push(c);
    });
  }

  // Só remove o hash do Firestore das contas que entraram no Firebase Auth (0.5-A5)
  for (const c of migrados) {
    await db.collection('users').doc(c.uid).update({ passwordHash: FieldValue.delete() });
  }

  console.log(`${migrados.length} conta(s) migrada(s); passwordHash removido dessas contas.`);
  if (migrados.length !== candidatos.length) {
    console.log('Contas com falha mantêm o passwordHash para nova tentativa.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
