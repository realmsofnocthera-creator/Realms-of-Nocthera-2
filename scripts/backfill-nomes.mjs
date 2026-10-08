// Cria nomes/{nomeNormalizado} para personagens anteriores ao índice de nomes (0.5-C3).
// Uso:  node scripts/backfill-nomes.mjs            (simula)
//       node scripts/backfill-nomes.mjs --aplicar  (grava)
// Requer credenciais do Admin SDK (GOOGLE_APPLICATION_CREDENTIALS ou ADC).
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const aplicar = process.argv.includes('--aplicar');
const db = getFirestore(initializeApp({ projectId: config.projectId }), config.firestoreDatabaseId);

const snap = await db.collection('characters').select('nome').get();
const vistos = new Map();
let criados = 0;
let conflitos = 0;

for (const doc of snap.docs) {
  const nome = String(doc.data().nome ?? '');
  const chave = nome.trim().toLowerCase();
  if (!chave) continue;
  if (vistos.has(chave)) {
    conflitos++;
    console.warn(`CONFLITO: "${nome}" (${doc.id}) repete o nome de ${vistos.get(chave)}. Resolver manualmente.`);
    continue;
  }
  vistos.set(chave, doc.id);
  if (aplicar) {
    await db.collection('nomes').doc(chave).create({ uid: doc.id, nome }).catch((e) => {
      if (e.code !== 6) throw e; // 6 = ALREADY_EXISTS
    });
  }
  criados++;
}
console.log(`${aplicar ? 'Gravados' : 'Seriam gravados'}: ${criados}. Conflitos: ${conflitos}.`);
