import { describe, it, expect } from 'vitest';
// @ts-expect-error o script é .mjs (sem tipos)
import { limparJogadores, COLECOES_INTEIRAS, COLECOES_POR_JOGADOR, COLECOES_MANTIDAS, CAMPOS_DO_DONO_A_LIMPAR, totalDeApagamentos } from '../../../scripts/limpar-jogadores.mjs';

/** Um "Firestore" de mentira: coleção → documentos (id → dados). */
function mundo() {
  const col: Record<string, Record<string, Record<string, unknown>>> = {};
  const poe = (c: string, id: string, d: Record<string, unknown> = {}) => ((col[c] ??= {})[id] = d);
  for (const c of [...COLECOES_INTEIRAS, ...COLECOES_MANTIDAS]) poe(c, 'x1');
  for (const uid of ['DONO', 'a', 'b', 'c']) {
    poe('characters', uid, { guildaId: 'g1', partyId: 'p1', nome: uid });
    poe('users', uid, { email: `${uid}@x.com` });
    poe('sancoes', uid);
    poe('revogacoes', uid);
    poe('transactions', `t-${uid}`, { uid });
    poe('combates', `${uid}__1`, { uid });
    poe('nomes', `n-${uid}`, { uid });
  }
  const logins = new Set(['DONO', 'a', 'b', 'c']);
  const limpou: string[][] = [];
  const io = {
    async contar(c: string) { return Object.keys(col[c] ?? {}).length; },
    async apagarColecao(c: string) { const n = Object.keys(col[c] ?? {}).length; delete col[c]; return n; },
    async *listar(c: string, campo: string) { for (const [id, d] of Object.entries(col[c] ?? {})) yield { id, dono: campo === 'id' ? id : d.uid }; },
    async apagarDocs(c: string, ids: string[]) { for (const id of ids) delete col[c][id]; },
    async *listarUsuarios() { for (const u of [...logins]) yield u; },
    async apagarUsuarios(uids: string[]) { for (const u of uids) logins.delete(u); },
    async limparReferenciasDoDono(uid: string, campos: string[]) { limpou.push(campos); for (const c of campos) delete col.characters[uid][c]; return true; },
  };
  return { col, logins, io, limpou };
}

describe('limpeza de jogadores (núcleo do script)', () => {
  it('o ensaio não apaga nada e conta o que apagaria', async () => {
    const m = mundo();
    const r = await limparJogadores({ io: m.io, donoUid: 'DONO', executar: false });
    expect(r.usuarios.apagar).toBe(3);
    expect(r.colecoesPorJogador.characters).toBe(3);
    expect(r.colecoesPorJogador.transactions).toBe(3);
    expect(Object.keys(m.col.characters)).toHaveLength(4);
    expect(m.logins.size).toBe(4);
    expect(m.col.guildas).toBeDefined();
    expect(totalDeApagamentos(r)).toBeGreaterThan(0);
  });

  it('executar apaga todos menos o dono (Firestore e logins), mantém o painel e limpa as referências do dono', async () => {
    const m = mundo();
    const r = await limparJogadores({ io: m.io, donoUid: 'DONO', executar: true });
    expect(r.donoLimpo).toBe(true);
    for (const { colecao } of COLECOES_POR_JOGADOR) {
      const ids = Object.keys(m.col[colecao] ?? {});
      expect(ids.length, colecao).toBe(1);
      expect(ids[0].includes('DONO') || ids[0] === 'DONO', colecao).toBe(true);
    }
    for (const c of COLECOES_INTEIRAS) expect(m.col[c], c).toBeUndefined();
    for (const c of COLECOES_MANTIDAS) expect(Object.keys(m.col[c]), c).toEqual(['x1']);
    expect([...m.logins]).toEqual(['DONO']);
    for (const campo of CAMPOS_DO_DONO_A_LIMPAR) expect(m.col.characters.DONO[campo]).toBeUndefined();
    expect(m.col.characters.DONO.nome).toBe('DONO');
  });

  it('sem dono identificado, recusa e não apaga nada', async () => {
    const m = mundo();
    await expect(limparJogadores({ io: m.io, donoUid: '', executar: true })).rejects.toThrow('Dono não identificado');
    expect(m.logins.size).toBe(4);
    expect(Object.keys(m.col.characters)).toHaveLength(4);
  });
});
