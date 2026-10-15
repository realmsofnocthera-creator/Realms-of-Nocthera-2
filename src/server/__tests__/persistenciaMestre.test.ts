import { describe, it, expect } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { criarRepositorioFirestore } from '@/server/persistencia/firestore';
import { ErroPersistencia } from '@/server/persistencia/tipos';

type Dados = Record<string, unknown>;

/** Firestore mínimo em memória só com o que os papéis e o log usam. */
class FirestoreFalso {
  docs = new Map<string, Dados>();
  falhaNaGravacao: { code: number } | null = null;

  collection(nome: string) {
    const prefixo = `${nome}/`;
    const todos = () => [...this.docs.entries()].filter(([c]) => c.startsWith(prefixo)).map(([c, d]) => ({ id: c.slice(prefixo.length), data: () => structuredClone(d) }));
    return {
      doc: (id: string) => ({
        get: async () => ({ exists: this.docs.has(prefixo + id), data: () => (this.docs.has(prefixo + id) ? structuredClone(this.docs.get(prefixo + id)) : undefined) }),
        set: async (d: Dados) => {
          this.checarFalha();
          this.docs.set(prefixo + id, structuredClone(d));
        },
        delete: async () => {
          this.checarFalha();
          this.docs.delete(prefixo + id);
        },
        create: async (d: Dados) => {
          this.checarFalha();
          if (this.docs.has(prefixo + id)) throw Object.assign(new Error('já existe'), { code: 6 });
          this.docs.set(prefixo + id, structuredClone(d));
        },
      }),
      get: async () => ({ docs: todos() }),
      orderBy: (campo: string, sentido: 'asc' | 'desc') => ({
        limit: (n: number) => ({
          get: async () => ({
            docs: todos()
              .sort((a, b) => String(a.data()[campo]).localeCompare(String(b.data()[campo])) * (sentido === 'desc' ? -1 : 1))
              .slice(0, n),
          }),
        }),
      }),
    };
  }

  private checarFalha() {
    if (this.falhaNaGravacao) throw Object.assign(new Error('falha de gravação'), this.falhaNaGravacao);
  }
}

const criar = () => {
  const db = new FirestoreFalso();
  return { db, repo: criarRepositorioFirestore(db as unknown as Firestore) };
};

describe('Firestore: papéis do painel e log administrativo', () => {
  it('guarda e lê um papel; lista todos; remove', async () => {
    const { repo } = criar();
    expect(await repo.lerPapelMestre('u1')).toBeNull();
    await repo.gravarPapelMestre({ uid: 'u1', papel: 'mestre', concedidoPor: 'dono', concedidoEm: '2026-10-15T10:00:00.000Z', motivo: 'mapas' });
    await repo.gravarPapelMestre({ uid: 'u2', papel: 'suporte', concedidoPor: 'dono', concedidoEm: '2026-10-15T11:00:00.000Z', motivo: 'leitura' });
    expect(await repo.lerPapelMestre('u1')).toEqual({ uid: 'u1', papel: 'mestre', concedidoPor: 'dono', concedidoEm: '2026-10-15T10:00:00.000Z', motivo: 'mapas' });
    expect((await repo.listarPapeisMestre()).map((p) => p.uid).sort()).toEqual(['u1', 'u2']);
    await repo.removerPapelMestre('u1');
    expect(await repo.lerPapelMestre('u1')).toBeNull();
  });

  it('um documento com papel inválido ou apagado do tipo é ignorado, na leitura e na lista', async () => {
    const { db, repo } = criar();
    db.docs.set('mestres/ruim', { papel: 'superadmin' });
    db.docs.set('mestres/vazio', {});
    db.docs.set('mestres/ok', { papel: 'moderador' });
    expect(await repo.lerPapelMestre('ruim')).toBeNull();
    expect(await repo.lerPapelMestre('vazio')).toBeNull();
    expect(await repo.lerPapelMestre('ok')).toMatchObject({ papel: 'moderador', concedidoPor: '', motivo: '' });
    expect((await repo.listarPapeisMestre()).map((p) => p.uid)).toEqual(['ok']);
  });

  it('o log é criado uma vez só: repetir o id falha e não sobrescreve', async () => {
    const { db, repo } = criar();
    const base = { id: 'e1', criadoEm: '2026-10-15T10:00:00.000Z', uid: 'dono', email: 'd@x', papel: 'dono' as const, acao: 'papel.conceder', alvo: 'u1', antes: { papel: null }, depois: { papel: 'mestre' }, motivo: 'teste', ip: '1.1.1.1' };
    await repo.registrarLogAdmin(base);
    await expect(repo.registrarLogAdmin({ ...base, acao: 'outra' })).rejects.toBeInstanceOf(ErroPersistencia);
    expect(db.docs.get('logAdmin/e1')?.acao).toBe('papel.conceder');
    // o id não é gravado dentro do documento
    expect(db.docs.get('logAdmin/e1')).not.toHaveProperty('id');
  });

  it('lê o log do mais recente ao mais antigo, com o limite, e preserva os campos opcionais', async () => {
    const { repo } = criar();
    for (let i = 0; i < 4; i++) {
      await repo.registrarLogAdmin({ id: `e${i}`, criadoEm: `2026-10-15T10:00:0${i}.000Z`, uid: 'dono', email: 'd@x', papel: 'dono', acao: `a${i}`, ...(i === 3 ? { alvo: 'u1', motivo: 'm', ip: '2.2.2.2', antes: { papel: null }, depois: { papel: 'mestre' } } : {}) });
    }
    const log = await repo.listarLogAdmin(3);
    expect(log.map((e) => e.id)).toEqual(['e3', 'e2', 'e1']);
    expect(log[0]).toMatchObject({ alvo: 'u1', motivo: 'm', ip: '2.2.2.2', antes: { papel: null }, depois: { papel: 'mestre' } });
    expect(log[1]).not.toHaveProperty('alvo');
  });

  it('falha de gravação no banco vira ErroPersistencia, nunca sucesso silencioso', async () => {
    const { db, repo } = criar();
    db.falhaNaGravacao = { code: 14 };
    await expect(repo.gravarPapelMestre({ uid: 'u1', papel: 'mestre', concedidoPor: 'd', concedidoEm: '', motivo: 'm' })).rejects.toBeInstanceOf(ErroPersistencia);
    await expect(repo.registrarLogAdmin({ id: 'x', criadoEm: '', uid: 'd', email: '', papel: 'dono', acao: 'a' })).rejects.toBeInstanceOf(ErroPersistencia);
    await expect(repo.removerPapelMestre('u1')).rejects.toBeInstanceOf(ErroPersistencia);
  });
});
