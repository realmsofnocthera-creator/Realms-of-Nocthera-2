import { describe, it, expect, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { sancaoDocumentoVazio } from '@/rules/sancoes';
import { criarRepositorioFirestore } from '@/server/persistencia/firestore';
import { ErroPersistencia, type Repositorio } from '@/server/persistencia/tipos';

type Dados = Record<string, unknown>;

/** Firestore mínimo em memória: documentos, where por igualdade e as gravações usadas por sanções e transações. */
class FirestoreFalso {
  docs = new Map<string, Dados>();
  falha: { code: number } | null = null;

  collection(nome: string) {
    const prefixo = `${nome}/`;
    const todos = (filtros: ((d: Dados) => boolean)[] = []) =>
      [...this.docs.entries()]
        .filter(([c]) => c.startsWith(prefixo))
        .map(([c, d]) => ({ id: c.slice(prefixo.length), d }))
        .filter(({ d }) => filtros.every((f) => f(d)))
        .map(({ id, d }) => ({ id, data: () => structuredClone(d) }));
    const consulta = (filtros: ((d: Dados) => boolean)[]) => ({
      where: (campo: string, _op: '==', valor: unknown) => consulta([...filtros, (d) => d[campo] === valor]),
      get: async () => ({ docs: todos(filtros) }),
    });
    return {
      ...consulta([]),
      doc: (id: string) => ({
        get: async () => ({ exists: this.docs.has(prefixo + id), data: () => (this.docs.has(prefixo + id) ? structuredClone(this.docs.get(prefixo + id)) : undefined) }),
        set: async (d: Dados) => {
          if (this.falha) throw Object.assign(new Error('falha'), this.falha);
          this.docs.set(prefixo + id, structuredClone(d));
        },
      }),
    };
  }
}

describe('Sanções e transações no Firestore', () => {
  let fs: FirestoreFalso;
  let repo: Repositorio;

  beforeEach(() => {
    fs = new FirestoreFalso();
    repo = criarRepositorioFirestore(fs as unknown as Firestore);
  });

  it('sem documento, não há sanção', async () => {
    expect(await repo.lerSancao('u1')).toBeNull();
  });

  it('grava e lê a sanção, com o histórico de advertências, sem guardar o uid dentro do documento', async () => {
    const doc = {
      ...sancaoDocumentoVazio('u1'),
      tipo: 'suspensao' as const,
      ate: '2026-10-20T12:00:00.000Z',
      motivo: 'ofensas',
      aplicadaPor: 'mod1',
      aplicadaEm: '2026-10-16T12:00:00.000Z',
      advertencias: [{ em: '2026-10-10T00:00:00.000Z', por: 'mod1', motivo: 'linguagem' }],
    };
    await repo.gravarSancao(doc);
    expect(fs.docs.get('sancoes/u1')).not.toHaveProperty('uid');
    expect(await repo.lerSancao('u1')).toEqual(doc);
  });

  it('lê com segurança um documento incompleto ou com tipo desconhecido', async () => {
    fs.docs.set('sancoes/u2', { tipo: 'expulsao', advertencias: ['lixo', { em: 'a', por: 'b', motivo: 'c' }] });
    expect(await repo.lerSancao('u2')).toMatchObject({ uid: 'u2', tipo: null, ate: null, advertencias: [{ em: 'a', por: 'b', motivo: 'c' }] });
  });

  it('falha do banco ao gravar vira ErroPersistencia', async () => {
    fs.falha = { code: 14 };
    await expect(repo.gravarSancao(sancaoDocumentoVazio('u1'))).rejects.toBeInstanceOf(ErroPersistencia);
  });

  it('lista só as transações do jogador, da mais recente para a mais antiga, até o limite', async () => {
    const tx = (uid: string, n: number, moeda = 'ouro') => ({ uid, tipo: 'ganho', quantidade: n, moeda, motivo: `m${n}`, timestamp: `2026-10-${String(10 + n).padStart(2, '0')}T10:00:00.000Z` });
    fs.docs.set('transactions/a', tx('u1', 1));
    fs.docs.set('transactions/b', tx('u1', 3, 'diamantes'));
    fs.docs.set('transactions/c', tx('u1', 2));
    fs.docs.set('transactions/d', tx('u2', 9));
    fs.docs.set('transactions/e', { uid: 'u1', tipo: 'perda', quantidade: 'x', timestamp: '2026-10-01T00:00:00.000Z' });
    const todas = await repo.listarTransacoes('u1', 10);
    expect(todas.map((t) => t.motivo)).toEqual(['m3', 'm2', 'm1', '']);
    expect(todas[0]).toMatchObject({ id: 'b', uid: 'u1', moeda: 'diamantes', tipo: 'ganho', quantidade: 3 });
    expect(todas[3]).toMatchObject({ tipo: 'perda', quantidade: 0 });
    expect((await repo.listarTransacoes('u1', 2)).map((t) => t.motivo)).toEqual(['m3', 'm2']);
    expect(await repo.listarTransacoes('sem-transacoes', 10)).toEqual([]);
  });

  it('lê o saldo antes e depois, a chave, a operação e a ordem (6.5-3); empate de hora segue a ordem', async () => {
    const quando = '2026-10-24T10:00:00.000Z';
    fs.docs.set('transactions/a', { uid: 'u1', tipo: 'ganho', quantidade: 5, moeda: 'fragmentosSubclasse', chave: 'colosso', motivo: 'm1', timestamp: quando, saldoAntes: 0, saldoDepois: 5, operacao: 'batalhaSangrenta', ordem: 0 });
    fs.docs.set('transactions/b', { uid: 'u1', tipo: 'perda', quantidade: 2, moeda: 'cartas', motivo: 'm2', timestamp: quando, saldoAntes: 3, saldoDepois: 1, operacao: 'alma:destruir', ordem: 1, semRegistro: true });
    fs.docs.set('transactions/c', { uid: 'u1', tipo: 'ganho', quantidade: 1, moeda: 'ouro', motivo: 'm3', timestamp: quando, saldoAntes: 'x' });
    const [b, a, c] = await repo.listarTransacoes('u1', 10);
    expect(a).toMatchObject({ id: 'a', chave: 'colosso', saldoAntes: 0, saldoDepois: 5, operacao: 'batalhaSangrenta', ordem: 0 });
    expect(b).toMatchObject({ id: 'b', moeda: 'cartas', saldoAntes: 3, saldoDepois: 1, semRegistro: true });
    expect(c).not.toHaveProperty('saldoAntes');
  });
});
