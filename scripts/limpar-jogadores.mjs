#!/usr/bin/env node
/**
 * LIMPEZA DE JOGADORES — apaga os dados de todos os jogadores (Firestore e logins do Firebase Auth, com os e-mails) e MANTÉM só o dono.
 * IRREVERSÍVEL. Por padrão só mostra o que seria apagado (ensaio). Para apagar de verdade, leia docs/LIMPEZA_DE_JOGADORES.md.
 *
 *   node scripts/limpar-jogadores.mjs                                  # ensaio: conta e não apaga nada
 *   node scripts/limpar-jogadores.mjs --executar --confirmar="APAGAR <projectId>"
 *
 * Usa as credenciais do gcloud (Application Default Credentials): `gcloud auth application-default login` com a conta dona do projeto.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  COLECOES_MANTIDAS, criarIo, EMAIL_DO_DONO, limparJogadores, totalDeApagamentos,
} from '../src/server/limpezaDeJogadores.mjs';

// ---------------------------------------------------------------- uso real (Firebase Admin)
async function principal() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const config = JSON.parse(readFileSync(resolve(aqui, '../firebase-applet-config.json'), 'utf8'));
  const mestreTs = readFileSync(resolve(aqui, '../src/server/mestre.ts'), 'utf8');
  const donosDoCodigo = [...(mestreTs.match(/DONOS_DO_PROJETO[^=]*=\s*\[([^\]]*)\]/)?.[1].matchAll(/'([^']+)'/g) ?? [])].map((m) => m[1]);

  const args = process.argv.slice(2);
  const executar = args.includes('--executar');
  const confirmar = args.find((a) => a.startsWith('--confirmar='))?.slice('--confirmar='.length) ?? '';
  const emailDoDono = args.find((a) => a.startsWith('--dono-email='))?.slice('--dono-email='.length) ?? EMAIL_DO_DONO;
  const frase = `APAGAR ${config.projectId}`;

  const { initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = initializeApp({ projectId: config.projectId });
  const auth = getAuth(app);
  const db = getFirestore(app, config.firestoreDatabaseId);

  console.log(`Projeto: ${config.projectId}\nBanco:   ${config.firestoreDatabaseId}`);
  let dono;
  try {
    dono = await auth.getUserByEmail(emailDoDono);
  } catch {
    console.error(`ABORTADO: não achei o login do dono (${emailDoDono}) no Firebase Auth. Nada foi apagado.`);
    process.exit(1);
  }
  if (donosDoCodigo.length && !donosDoCodigo.includes(dono.uid)) {
    console.error(`ABORTADO: o uid do e-mail do dono (${dono.uid}) não é o Dono registrado no código (${donosDoCodigo.join(', ')}). Confira antes de apagar. Nada foi apagado.`);
    process.exit(1);
  }
  console.log(`Dono preservado: ${emailDoDono} (uid ${dono.uid})\nModo:    ${executar ? 'EXECUTAR (apaga de verdade)' : 'ENSAIO (não apaga nada)'}\n`);
  if (executar && confirmar !== frase) {
    console.error(`ABORTADO: para apagar de verdade, passe --confirmar="${frase}". Nada foi apagado.`);
    process.exit(1);
  }

  const io = criarIo({ db, auth, FieldValue, avisar: (m) => console.warn(m) });

  const r = await limparJogadores({ io, donoUid: dono.uid, executar });
  console.log(executar ? 'APAGADO:' : 'SERIA APAGADO (ensaio):');
  for (const [c, n] of Object.entries(r.colecoesInteiras)) console.log(`  ${c.padEnd(16)} ${n} documentos (coleção inteira)`);
  for (const [c, n] of Object.entries(r.colecoesPorJogador)) console.log(`  ${c.padEnd(16)} ${n} documentos (menos o do dono)`);
  console.log(`  Firebase Auth    ${r.usuarios.apagar} logins (menos o do dono)`);
  console.log(`Mantidos: ${COLECOES_MANTIDAS.join(', ')} e o personagem e o login do dono.`);
  const total = totalDeApagamentos(r) + r.usuarios.apagar;
  if (total > 15000) console.log(`ATENÇÃO: ${total} exclusões. O plano Spark limita a 20 mil exclusões de documentos por dia; se passar, o Firestore recusa o resto até o dia seguinte (rode de novo).`);
  if (!executar) console.log('\nNada foi apagado. Para apagar de verdade, veja docs/LIMPEZA_DE_JOGADORES.md.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => {
    console.error('Falhou:', e?.message ?? e);
    process.exit(1);
  });
}
