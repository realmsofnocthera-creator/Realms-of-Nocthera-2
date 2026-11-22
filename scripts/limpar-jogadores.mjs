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

export const EMAIL_DO_DONO = 'mineirosangela1@gmail.com';

/** Coleções de jogadores apagadas por inteiro (com tudo que há dentro, subcoleções incluídas). */
export const COLECOES_INTEIRAS = [
  'guildas', 'nomesDeGuilda', 'partys', 'chat', 'mercado', 'mercadoPrecos', 'leilao', 'arena', 'arenaRanqueada', 'arenaReplays',
  'campeonatos', 'chefeMundial', 'chefeSemanal', 'cadastrosDaRede', 'ranking', 'revisao',
];

/** Coleções com um documento por jogador (ou com o campo `uid`): apaga tudo menos o do dono. `campo: 'id'` = o id do documento é o uid. */
export const COLECOES_POR_JOGADOR = [
  { colecao: 'characters', campo: 'id' },
  { colecao: 'users', campo: 'id' },
  { colecao: 'sancoes', campo: 'id' },
  { colecao: 'revogacoes', campo: 'id' },
  { colecao: 'transactions', campo: 'uid' },
  { colecao: 'combates', campo: 'uid' },
  { colecao: 'nomes', campo: 'uid' },
];

/** NUNCA tocadas: o Mestre e o painel (mestres, configuracao, conteudo), o log do painel (logAdmin) e o Correio para todos (correioGeral). */
export const COLECOES_MANTIDAS = ['mestres', 'configuracao', 'conteudo', 'logAdmin', 'correioGeral'];

/** Os campos do personagem do dono que apontavam para coisas que a limpeza apagou (guilda, party, anúncios do Mercado). */
export const CAMPOS_DO_DONO_A_LIMPAR = ['guildaId', 'guildaNome', 'convitesDeGuilda', 'pedidosDeGuilda', 'partyId', 'convitesDeParty', 'anunciosNoMercado'];

/**
 * O núcleo, sem Firebase (testável): `io` faz o trabalho de verdade. Devolve o resumo. Sem `executar`, só conta (nada é apagado).
 * Recusa-se a rodar se o dono não for identificado.
 */
export async function limparJogadores({ io, donoUid, executar }) {
  if (!donoUid || typeof donoUid !== 'string') throw new Error('Dono não identificado: nada foi apagado.');
  const resumo = { executar, donoUid, colecoesInteiras: {}, colecoesPorJogador: {}, usuarios: { apagar: 0 }, donoLimpo: false };

  for (const colecao of COLECOES_INTEIRAS) {
    resumo.colecoesInteiras[colecao] = executar ? await io.apagarColecao(colecao) : await io.contar(colecao);
  }
  for (const { colecao, campo } of COLECOES_POR_JOGADOR) {
    const alvos = [];
    for await (const doc of io.listar(colecao, campo)) if (doc.dono !== donoUid) alvos.push(doc.id);
    resumo.colecoesPorJogador[colecao] = alvos.length;
    if (executar && alvos.length) await io.apagarDocs(colecao, alvos);
  }
  const usuarios = [];
  for await (const uid of io.listarUsuarios()) if (uid !== donoUid) usuarios.push(uid);
  resumo.usuarios.apagar = usuarios.length;
  if (executar) {
    for (let i = 0; i < usuarios.length; i += 1000) await io.apagarUsuarios(usuarios.slice(i, i + 1000));
    resumo.donoLimpo = await io.limparReferenciasDoDono(donoUid, CAMPOS_DO_DONO_A_LIMPAR);
  }
  return resumo;
}

/** O total de documentos e logins que a limpeza apaga (para avisar da cota diária de exclusões do plano Spark: 20 mil). */
export const totalDeApagamentos = (r) =>
  Object.values(r.colecoesInteiras).reduce((a, b) => a + b, 0) + Object.values(r.colecoesPorJogador).reduce((a, b) => a + b, 0);

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

  const io = {
    async contar(colecao) {
      return (await db.collection(colecao).count().get()).data().count;
    },
    async apagarColecao(colecao) {
      const n = await this.contar(colecao);
      await db.recursiveDelete(db.collection(colecao));
      return n;
    },
    async *listar(colecao, campo) {
      let ultimo = null;
      for (;;) {
        let q = db.collection(colecao).orderBy('__name__').limit(500);
        if (campo === 'uid') q = q.select('uid');
        else q = q.select();
        if (ultimo) q = q.startAfter(ultimo);
        const snap = await q.get();
        if (snap.empty) return;
        for (const d of snap.docs) yield { id: d.id, dono: campo === 'id' ? d.id : d.get('uid') };
        ultimo = snap.docs[snap.docs.length - 1];
      }
    },
    async apagarDocs(colecao, ids) {
      for (let i = 0; i < ids.length; i += 400) {
        const lote = db.batch();
        for (const id of ids.slice(i, i + 400)) lote.delete(db.collection(colecao).doc(id));
        await lote.commit();
      }
    },
    async *listarUsuarios() {
      let token;
      do {
        const pagina = await auth.listUsers(1000, token);
        for (const u of pagina.users) yield u.uid;
        token = pagina.pageToken;
      } while (token);
    },
    async apagarUsuarios(uids) {
      const r = await auth.deleteUsers(uids);
      if (r.failureCount) console.warn(`Aviso: ${r.failureCount} logins não puderam ser apagados.`);
    },
    async limparReferenciasDoDono(uid, campos) {
      const ref = db.collection('characters').doc(uid);
      if (!(await ref.get()).exists) return false;
      await ref.update(Object.fromEntries(campos.map((c) => [c, FieldValue.delete()])));
      return true;
    },
  };

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
