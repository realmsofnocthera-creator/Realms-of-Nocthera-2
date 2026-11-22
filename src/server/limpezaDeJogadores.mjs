/**
 * LIMPEZA DE JOGADORES — o núcleo (sem Firebase, testável), usado pelo script `scripts/limpar-jogadores.mjs` e pelo Painel do Mestre
 * (`/api/mestre/limpeza`). Apaga os dados de todos os jogadores e mantém só o dono. IRREVERSÍVEL. Sem `executar`, só conta.
 */
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


/** O "io" de verdade (Firebase Admin): `db` (Firestore), `auth` (Auth) e `FieldValue`. `avisar` recebe os avisos não fatais. */
export function criarIo({ db, auth, FieldValue, avisar = (_mensagem) => {} }) {
  return {
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
      if (r.failureCount) avisar(`Aviso: ${r.failureCount} logins não puderam ser apagados.`);
    },
    async limparReferenciasDoDono(uid, campos) {
      const ref = db.collection('characters').doc(uid);
      if (!(await ref.get()).exists) return false;
      await ref.update(Object.fromEntries(campos.map((c) => [c, FieldValue.delete()])));
      return true;
    },
  };
}
