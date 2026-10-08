import { describe, it, expect, beforeEach, vi } from 'vitest';

// Firestore falso: transações com escritas em buffer, aplicadas só se o callback termina sem erro.
const fake = vi.hoisted(() => {
  const dados = new Map<string, Record<string, unknown>>();
  const chamadas = { varreduras: 0, consultasNome: 0, transacoes: 0 };
  let falhar: Error | null = null;
  let fila: Promise<unknown> = Promise.resolve();

  const snap = (caminho: string) => {
    const d = dados.get(caminho);
    return { exists: d !== undefined, data: () => d, id: caminho.split('/')[1] };
  };
  const ref = (colecao: string, id: string) => ({
    path: `${colecao}/${id}`,
    get: async () => {
      if (falhar) throw falhar;
      return snap(`${colecao}/${id}`);
    },
    set: async (v: Record<string, unknown>) => {
      if (falhar) throw falhar;
      dados.set(`${colecao}/${id}`, v);
    },
  });
  const adminDb = {
    collection: (colecao: string) => ({
      doc: (id: string) => ref(colecao, id),
      select: () => {
        chamadas.varreduras++;
        return { get: async () => ({ empty: true, docs: [] }) };
      },
      where: () => ({
        limit: () => ({
          get: async () => {
            chamadas.consultasNome++;
            return { empty: true, docs: [] };
          },
        }),
      }),
    }),
    // O Firestore real isola transações (aborta e repete a que conflita); aqui rodam em fila.
    runTransaction: (fn: (t: unknown) => Promise<unknown>) => {
      const execucao = fila.then(() => executar(fn));
      fila = execucao.catch(() => undefined);
      return execucao;
    },
  };
  const executar = async (fn: (t: unknown) => Promise<unknown>) => {
      if (falhar) throw falhar;
      chamadas.transacoes++;
      const buffer: Array<[string, Record<string, unknown> | null]> = [];
      const t = {
        get: async (r: { path: string }) => snap(r.path),
        set: (r: { path: string }, v: Record<string, unknown>) => void buffer.push([r.path, v]),
        delete: (r: { path: string }) => void buffer.push([r.path, null]),
      };
      const resultado = await fn(t);
      for (const [caminho, valor] of buffer) {
        if (valor === null) dados.delete(caminho);
        else dados.set(caminho, valor);
      }
      return resultado;
  };
  return {
    adminDb,
    dados,
    chamadas,
    falharCom: (e: Error | null) => {
      falhar = e;
    },
  };
});

vi.mock('../firebaseAdmin', () => ({ adminDb: fake.adminDb, adminApp: {} }));

import {
  FirestorePersistence,
  NomeEmUsoError,
  PersistenciaIndisponivelError,
  PersonagemJaExisteError,
  personagemParaFirestore,
} from '../persistence';
import type { CharacterDocument } from '../characterTypes';

function personagem(uid: string, nome: string, ouro = 100): CharacterDocument {
  return {
    uid,
    nome,
    avatarId: 'barbaro',
    racaId: 'humano',
    classeId: 'barbaro',
    nivel: 1,
    xpAtual: 0,
    pontosDisponiveis: 0,
    ouro,
    diamantes: 0,
    hpMax: 10,
    manaMax: 5,
    sobreescudoMax: 0,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atributos: { vigor: 5, mente: 2, forca: 4, vitalidade: 1, arcano: 0, inteligencia: 0, agilidade: 1 },
  };
}

describe('0.5-C1 — falha do Firestore nunca vira sucesso silencioso', () => {
  beforeEach(() => {
    fake.dados.clear();
    fake.falharCom(null);
  });

  it('leitura com Firestore fora do ar rejeita (não devolve "personagem inexistente")', async () => {
    const p = new FirestorePersistence();
    fake.falharCom(new Error('UNAVAILABLE'));
    await expect(p.lerPersonagem('u1')).rejects.toBeInstanceOf(PersistenciaIndisponivelError);
  });

  it('gravação com Firestore fora do ar rejeita e não deixa dados parciais', async () => {
    const p = new FirestorePersistence();
    fake.falharCom(Object.assign(new Error('UNAVAILABLE'), { code: 14 }));
    await expect(p.criarPersonagem(personagem('u1', 'Alfa'))).rejects.toBeInstanceOf(
      PersistenciaIndisponivelError
    );
    fake.falharCom(null);
    expect(fake.dados.size).toBe(0);
  });

  it('a mensagem entregue ao cliente não vaza detalhe interno', async () => {
    const p = new FirestorePersistence();
    fake.falharCom(new Error('segredo-interno-do-projeto'));
    let erro: PersistenciaIndisponivelError | null = null;
    try {
      await p.lerPersonagem('u1');
    } catch (e) {
      erro = e as PersistenciaIndisponivelError;
    }
    expect(erro).not.toBeNull();
    expect(erro!.message).not.toContain('segredo-interno');
    expect(erro!.detalhe).toContain('segredo-interno');
  });
});

describe('0.5-C2 — alterações atômicas por transação', () => {
  beforeEach(() => {
    fake.dados.clear();
    fake.falharCom(null);
    fake.chamadas.transacoes = 0;
  });

  it('personagem, transação e registro de combate são gravados na MESMA transação', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Alfa'));
    fake.chamadas.transacoes = 0;

    await p.mutarPersonagem(
      'u1',
      (atual) => ({
        proximo: { ...atual!, ouro: atual!.ouro + 10 },
        transacoes: [
          { id: 'tx_1', uid: 'u1', tipo: 'ganho', quantidade: 10, motivo: 'm', timestamp: 't' },
        ],
        resultado: 'ok',
      }),
      { idempotencia: { id: 'c1', auditoria: { seed: 7 } } }
    );

    expect(fake.chamadas.transacoes).toBe(1);
    expect(fake.dados.get('characters/u1')!.ouro).toBe(110);
    expect(fake.dados.get('transactions/tx_1')).toBeDefined();
    expect(fake.dados.get('combates/u1_c1')!.seed).toBe(7);
  });

  it('erro de regra dentro da transação descarta tudo (nada gravado pela metade)', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Alfa', 5));
    await expect(
      p.mutarPersonagem('u1', () => {
        throw new Error('Ouro insuficiente');
      })
    ).rejects.toThrow('Ouro insuficiente');
    expect(fake.dados.get('characters/u1')!.ouro).toBe(5);
  });

  it('mesma chave de idempotência devolve a resposta gravada e não reaplica', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Alfa', 0));
    const aplicar = () =>
      p.mutarPersonagem(
        'u1',
        (atual) => ({ proximo: { ...atual!, ouro: atual!.ouro + 50 }, resultado: { ouro: atual!.ouro + 50 } }),
        { idempotencia: { id: 'abc', auditoria: {} } }
      );
    const a = await aplicar();
    const b = await aplicar();
    expect(a.repetida).toBe(false);
    expect(b.repetida).toBe(true);
    expect(b.resultado).toEqual({ ouro: 50 });
    expect(fake.dados.get('characters/u1')!.ouro).toBe(50);
  });

  it('a trava distribuída serializa duas operações concorrentes do mesmo uid', async () => {
    const p = new FirestorePersistence();
    const ordem: string[] = [];
    const op = (nome: string) =>
      p.comTrava('u1', async () => {
        ordem.push(`${nome}:inicio`);
        await new Promise((r) => setTimeout(r, 40));
        ordem.push(`${nome}:fim`);
      });
    await Promise.all([op('A'), op('B')]);
    expect(ordem).toEqual(['A:inicio', 'A:fim', 'B:inicio', 'B:fim']);
    expect(fake.dados.has('locks/u1')).toBe(false);
  });
});

describe('0.5-C3 — unicidade de nome por índice', () => {
  beforeEach(() => {
    fake.dados.clear();
    fake.falharCom(null);
    fake.chamadas.varreduras = 0;
  });

  it('recusa nome repetido (case-insensitive) de outra conta, na mesma transação', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Yuri'));
    await expect(p.criarPersonagem(personagem('u2', ' yuri '))).rejects.toBeInstanceOf(NomeEmUsoError);
    expect(fake.dados.has('characters/u2')).toBe(false);
  });

  it('segundo personagem na mesma conta é recusado', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Yuri'));
    await expect(p.criarPersonagem(personagem('u1', 'Outro'))).rejects.toBeInstanceOf(PersonagemJaExisteError);
  });

  it('busca por nome usa o índice e nunca varre a coleção characters', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Yuri'));
    expect(await p.buscarUidPorNome('YURI')).toBe('u1');
    expect(await p.buscarUidPorNome('inexistente')).toBeNull();
    expect(fake.chamadas.varreduras).toBe(0);
  });

  it('o documento do índice guarda só uid e nome', async () => {
    const p = new FirestorePersistence();
    await p.criarPersonagem(personagem('u1', 'Yuri'));
    expect(fake.dados.get('nomes/yuri')).toEqual({ uid: 'u1', nome: 'Yuri' });
    expect(Object.keys(personagemParaFirestore(personagem('u1', 'Yuri')))).not.toContain('passwordHash');
  });
});
