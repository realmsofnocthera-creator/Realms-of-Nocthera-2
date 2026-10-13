import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import {
  criarRepositorioFirestore,
  personagemDoFirestore,
  personagemParaFirestore,
} from '@/server/persistencia/firestore';
import { ErroPersistencia } from '@/server/persistencia/tipos';
import type { CharacterDocument } from '@/server/characterService';

type Ref = { path: string; get: () => Promise<Snap> };
type Snap = { exists: boolean; data: () => Record<string, unknown> | undefined };

/** Firestore mínimo em memória: runTransaction aplica as gravações só se a função terminar. */
class FirestoreFalso {
  dados = new Map<string, Record<string, unknown>>();
  falhaLeitura: Array<{ code: number }> = [];
  falhaCommit: { code: number } | null = null;
  leituras = 0;

  private snap(path: string): Snap {
    const valor = this.dados.get(path);
    return { exists: valor !== undefined, data: () => (valor ? structuredClone(valor) : undefined) };
  }

  collection(nome: string) {
    return {
      doc: (id: string): Ref => ({
        path: `${nome}/${id}`,
        get: async () => {
          this.leituras += 1;
          const falha = this.falhaLeitura.shift();
          if (falha) throw Object.assign(new Error('falha de leitura'), falha);
          return this.snap(`${nome}/${id}`);
        },
      }),
    };
  }

  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    const gravacoes: Array<[string, Record<string, unknown>]> = [];
    const tx = {
      get: async (ref: Ref) => this.snap(ref.path),
      set: (ref: Ref, d: Record<string, unknown>) => gravacoes.push([ref.path, d]),
      create: (ref: Ref, d: Record<string, unknown>) => {
        if (this.dados.has(ref.path)) throw Object.assign(new Error('já existe'), { code: 6 });
        gravacoes.push([ref.path, d]);
      },
    };
    const valor = await fn(tx);
    if (this.falhaCommit) throw Object.assign(new Error('commit falhou'), this.falhaCommit);
    for (const [path, d] of gravacoes) this.dados.set(path, structuredClone(d));
    return valor;
  }
}

const PERSONAGEM: CharacterDocument = {
  uid: 'u1',
  nome: 'Aria',
  avatarId: 'barbaro',
  sobre: '',
  racaId: 'humano',
  classeId: 'barbaro',
  nivel: 3,
  xpAtual: 10,
  pontosDisponiveis: 2,
  pontosAlocadosPorNivel: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
  fragmentosAlma: 4,
  subclasseAtualId: null,
  subclasseTiers: {},
  atributos: { vigor: 6, sorte: 2, forca: 5, vitalidade: 1, arcano: 0, inteligencia: 0, agilidade: 1 },
  ouro: 120,
  diamantes: 7,
  hpMax: 80,
  sobreescudoMax: 0,
  criadoEm: '2026-10-01T00:00:00.000Z',
};

describe('0.5-C — repositório Firestore (caminho de produção)', () => {
  let db: FirestoreFalso;
  let repo: ReturnType<typeof criarRepositorioFirestore>;

  beforeEach(() => {
    db = new FirestoreFalso();
    repo = criarRepositorioFirestore(db as unknown as Firestore);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('converte o personagem para o Firestore e de volta sem perder campos persistidos', () => {
    const volta = personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM));
    expect(volta).toMatchObject({
      ...PERSONAGEM,
      habilidadesEquipadas: expect.any(Object),
      hpMax: 0,
      sobreescudoMax: 0,
    });
  });

  it('inventário e progresso da Caçada vão e voltam do Firestore', () => {
    const comCacada = { ...PERSONAGEM, inventario: { 'pele-de-lobo-cinzento': 3 }, cacadaChavesVencidas: [1, 2] };
    const volta = personagemDoFirestore('u1', personagemParaFirestore(comCacada));
    expect(volta.inventario).toEqual({ 'pele-de-lobo-cinzento': 3 });
    expect(volta.cacadaChavesVencidas).toEqual([1, 2]);
    const antigo = personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), inventario: undefined, cacadaChavesVencidas: 'x' });
    expect(antigo.inventario).toEqual({});
    expect(antigo.cacadaChavesVencidas).toEqual([]);
  });

  it('guarda e lê as tentativas da Batalha Sangrenta; documento antigo ou inválido fica sem elas', () => {
    const comBatalha = { ...PERSONAGEM, batalhaSangrenta: { dia: '2026-10-13', tentativas: 2 } };
    const volta = personagemDoFirestore('u1', personagemParaFirestore(comBatalha));
    expect(volta.batalhaSangrenta).toEqual({ dia: '2026-10-13', tentativas: 2 });
    expect(personagemParaFirestore(PERSONAGEM)).not.toHaveProperty('batalhaSangrenta');
    expect(personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM)).batalhaSangrenta).toBeUndefined();
    expect(personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), batalhaSangrenta: { tentativas: 2 } }).batalhaSangrenta).toBeUndefined();
    const vencidas = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, batalhaSangrentaVencidas: ['facil', 'medio'] }));
    expect(vencidas.batalhaSangrentaVencidas).toEqual(['facil', 'medio']);
    expect(personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM)).batalhaSangrentaVencidas).toBeUndefined();
  });

  it('armas da Forja vão e voltam do Firestore; documento antigo fica sem armas', () => {
    const arma = { id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana' as const, atributo: 'sorte' as const, pontos: 4, reforjas: 1, criadaEm: 't' };
    const volta = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, armas: [arma] }));
    expect(volta.armas).toEqual([arma]);
    const antigo = personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), armas: undefined });
    expect(antigo.armas).toEqual([]);
  });

  it('equipamento vai e volta do Firestore; descarta o que não existe mais e o documento antigo fica sem nada equipado', () => {
    const arma = { id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana' as const, atributo: 'sorte' as const, pontos: 4, reforjas: 0, criadaEm: 't' };
    const elmo = { id: 'p1', pecaId: 'rato-da-floresta-elmo', atributo: 'vigor' as const, pontos: 2, reforjas: 0, xp: 0, criadaEm: 't' };
    const equipado = { armaId: 'a1', armadura: { elmo: 'p1' } };
    const volta = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, armas: [arma], armaduras: [elmo], equipamento: equipado }));
    expect(volta.equipamento).toEqual(equipado);
    const orfao = personagemDoFirestore('u1', { ...personagemParaFirestore({ ...PERSONAGEM, armas: [arma], armaduras: [elmo], equipamento: equipado }), armas: [] });
    expect(orfao.equipamento).toEqual({ armaId: null, armadura: { elmo: 'p1' } });
    expect(personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), equipamento: undefined }).equipamento).toEqual({ armaId: null, armadura: {} });
  });

  it('armaduras vão e voltam do Firestore; documento antigo fica sem armaduras', () => {
    const peca = { id: 'p1', pecaId: 'rato-da-floresta-elmo', atributo: 'vigor' as const, pontos: 2, reforjas: 0, xp: 120, criadaEm: 't' };
    const volta = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, armaduras: [peca] }));
    expect(volta.armaduras).toEqual([peca]);
    expect(personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), armaduras: undefined }).armaduras).toEqual([]);
  });

  it('grava personagem, nome e transação juntos no fim da transação', async () => {
    await repo.executarTransacao('teste', async (ctx) => {
      ctx.gravarPersonagem(PERSONAGEM);
      ctx.reservarNome('n_x', 'u1', 'Aria');
      ctx.registrarTransacao({ id: 'tx1', uid: 'u1', tipo: 'ganho', quantidade: 5, moeda: 'ouro', motivo: 't', timestamp: 'agora' });
      // Leitura dentro da transação enxerga a própria gravação pendente
      expect((await ctx.lerPersonagem('u1'))?.ouro).toBe(120);
      expect(db.dados.size).toBe(0);
    });
    expect(db.dados.get('characters/u1')?.ouro).toBe(120);
    expect(db.dados.get('nomes/n_x')?.uid).toBe('u1');
    expect(db.dados.get('transactions/tx1')?.quantidade).toBe(5);
  });

  it('erro de regra no meio da transação não grava nada e chega intacto ao chamador', async () => {
    await expect(
      repo.executarTransacao('teste', async (ctx) => {
        ctx.gravarPersonagem(PERSONAGEM);
        throw new Error('Ouro insuficiente');
      })
    ).rejects.toThrow('Ouro insuficiente');
    expect(db.dados.size).toBe(0);
  });

  it('falha do banco no commit vira ErroPersistencia (503), nunca sucesso', async () => {
    db.falhaCommit = { code: 14 };
    const promessa = repo.executarTransacao('teste', async (ctx) => {
      ctx.gravarPersonagem(PERSONAGEM);
    });
    await expect(promessa).rejects.toBeInstanceOf(ErroPersistencia);
    expect(db.dados.size).toBe(0);
  });

  it('não permite abrir uma transação dentro de outra', async () => {
    await expect(
      repo.executarTransacao('externa', async () => {
        await repo.executarTransacao('interna', async () => undefined);
      })
    ).rejects.toThrow(/aberta dentro de "externa"/);
  });

  it('leitura com falha transitória é repetida; falha persistente vira ErroPersistencia', async () => {
    db.dados.set('characters/u1', personagemParaFirestore(PERSONAGEM));
    db.falhaLeitura = [{ code: 14 }];
    expect((await repo.lerPersonagem('u1'))?.nome).toBe('Aria');
    expect(db.leituras).toBe(2);

    db.leituras = 0;
    db.falhaLeitura = [{ code: 7 }]; // PERMISSION_DENIED: não adianta repetir
    await expect(repo.lerPersonagem('u1')).rejects.toBeInstanceOf(ErroPersistencia);
    expect(db.leituras).toBe(1);
  });
});
