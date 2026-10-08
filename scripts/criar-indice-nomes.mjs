#!/usr/bin/env node
/**
 * 0.5-C3 — Cria o índice nomes/{chave} para os personagens que já existem.
 * Rodar uma vez depois do deploy (antes disso, nomes antigos não aparecem na busca
 * de perfil público e não estão protegidos contra repetição).
 *
 * Uso (com credenciais de administrador, ex.: `gcloud auth application-default login`):
 *   node scripts/criar-indice-nomes.mjs            # simulação
 *   node scripts/criar-indice-nomes.mjs --aplicar  # grava o índice
 *
 * A chave segue src/server/persistencia/tipos.ts → chaveDoNome().
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const config = JSON.parse(
  readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')
);
const aplicar = process.argv.includes('--aplicar');
const db = getFirestore(initializeApp({ projectId: config.projectId }), config.firestoreDatabaseId);

function chaveDoNome(nome) {
  return `n_${Buffer.from(nome.trim().toLowerCase(), 'utf8').toString('base64url')}`;
}

const personagens = await db.collection('characters').select('nome').get();
const porChave = new Map();
for (const doc of personagens.docs) {
  const nome = doc.get('nome');
  if (typeof nome !== 'string' || !nome.trim()) continue;
  const chave = chaveDoNome(nome);
  if (!porChave.has(chave)) porChave.set(chave, []);
  porChave.get(chave).push({ uid: doc.id, nome: nome.trim() });
}

let criados = 0;
let existentes = 0;
const conflitos = [];
for (const [chave, donos] of porChave) {
  if (donos.length > 1) {
    conflitos.push(donos);
    continue;
  }
  const ref = db.collection('nomes').doc(chave);
  const snap = await ref.get();
  if (snap.exists) {
    existentes += 1;
    continue;
  }
  if (aplicar) {
    await ref.create({ uid: donos[0].uid, nome: donos[0].nome, criadoEm: new Date().toISOString() });
  }
  criados += 1;
}

console.log(`${personagens.size} personagem(ns); ${criados} índice(s) ${aplicar ? 'criado(s)' : 'a criar'}; ${existentes} já existia(m).`);
if (conflitos.length > 0) {
  console.log('Nomes repetidos (não indexados — decidir quem fica com o nome):');
  for (const donos of conflitos) {
    console.log(`  - ${donos.map((d) => `${d.nome} (${d.uid})`).join(', ')}`);
  }
  process.exitCode = 1;
}
if (!aplicar) console.log('Simulação: nada foi gravado. Rode com --aplicar para gravar.');
