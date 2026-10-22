import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import {
  guildaParaFirestore,
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
    const gravacoes: Array<[string, Record<string, unknown> | null]> = [];
    const tx = {
      get: async (ref: Ref) => this.snap(ref.path),
      set: (ref: Ref, d: Record<string, unknown>) => gravacoes.push([ref.path, d]),
      delete: (ref: Ref) => gravacoes.push([ref.path, null]),
      create: (ref: Ref, d: Record<string, unknown>) => {
        if (this.dados.has(ref.path)) throw Object.assign(new Error('já existe'), { code: 6 });
        gravacoes.push([ref.path, d]);
      },
    };
    const valor = await fn(tx);
    if (this.falhaCommit) throw Object.assign(new Error('commit falhou'), this.falhaCommit);
    for (const [path, d] of gravacoes) (d ? this.dados.set(path, structuredClone(d)) : this.dados.delete(path));
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

  it('guarda e lê o andar da Torre Celestial; documento antigo ou inválido fica sem ele', () => {
    expect(personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, torreAndar: 42 })).torreAndar).toBe(42);
    expect(personagemParaFirestore(PERSONAGEM)).not.toHaveProperty('torreAndar');
    expect(personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM)).torreAndar).toBeUndefined();
    expect(personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), torreAndar: 'x' }).torreAndar).toBeUndefined();
    expect(personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), torreAndar: -3 }).torreAndar).toBeUndefined();
  });

  it('guarda a privacidade e os campos derivados do Social (7.1); documento antigo fica sem eles', () => {
    const doc = personagemParaFirestore({ ...PERSONAGEM, nome: 'Aragorn', escondidoNoRanking: true, escondidoNaBusca: true, batalhaSangrentaVencidas: ['a', 'b'] as never, guerreiroVencidas: [1] as never });
    expect(doc.nomeBusca).toBe('aragorn');
    expect(doc.vitoriasBatalha).toBe(2);
    expect(doc.vitoriasGuerreiro).toBe(1);
    const volta = personagemDoFirestore('u1', doc);
    expect(volta.escondidoNoRanking).toBe(true);
    expect(volta.escondidoNaBusca).toBe(true);
    const antigo = personagemParaFirestore(PERSONAGEM);
    expect(antigo).not.toHaveProperty('escondidoNoRanking');
    expect(antigo).not.toHaveProperty('vitoriasBatalha');
    expect(personagemDoFirestore('u1', antigo).escondidoNaBusca).toBeUndefined();
  });

  it('guarda a guilda do personagem e os convites e pedidos (7.3); ids estranhos são descartados', () => {
    const doc = personagemParaFirestore({ ...PERSONAGEM, guildaId: 'g_abc123def', guildaNome: 'Folhaviva', convitesDeGuilda: ['g_aaaaaa1'], pedidosDeGuilda: ['g_bbbbbb2'] });
    const volta = personagemDoFirestore('u1', doc);
    expect(volta).toMatchObject({ guildaId: 'g_abc123def', guildaNome: 'Folhaviva', convitesDeGuilda: ['g_aaaaaa1'], pedidosDeGuilda: ['g_bbbbbb2'] });
    const antigo = personagemParaFirestore(PERSONAGEM);
    expect(antigo).not.toHaveProperty('guildaId');
    expect(antigo).not.toHaveProperty('convitesDeGuilda');
    expect(personagemDoFirestore('u1', { ...antigo, convitesDeGuilda: ['../x', 3, 'g_ok12345', 'g_ok12345'] }).convitesDeGuilda).toEqual(['g_ok12345']);
  });

  it('a guilda vai para o banco com o nome de busca e a quantidade de membros', () => {
    const g = { id: 'g_abc123', nome: 'Ordem  da Névoa', nomeBusca: '', descricao: '', criadaEm: '1', membros: [{ uid: 'a', nome: 'A', cargo: 'lider' as const, entrouEm: '1' }], convites: [], pedidos: [], quantidadeMembros: 0, xp: 0 };
    expect(guildaParaFirestore(g)).toMatchObject({ nomeBusca: 'ordem da névoa', quantidadeMembros: 1 });
  });

  it('guarda a party e os convites de party do personagem (7.4); ids estranhos são descartados', () => {
    const doc = personagemParaFirestore({ ...PERSONAGEM, partyId: 'p_0123456789ab', convitesDeParty: ['p_aaaaaaaaaaaa'] });
    expect(personagemDoFirestore('u1', doc)).toMatchObject({ partyId: 'p_0123456789ab', convitesDeParty: ['p_aaaaaaaaaaaa'] });
    const antigo = personagemParaFirestore(PERSONAGEM);
    expect(antigo).not.toHaveProperty('partyId');
    expect(personagemDoFirestore('u1', { ...antigo, convitesDeParty: ['../x', 3, 'p_aaaaaaaaaaaa', 'p_aaaaaaaaaaaa'] }).convitesDeParty).toEqual(['p_aaaaaaaaaaaa']);
  });

  it('a party é gravada no fim da transação, lida dentro dela e apagada (7.4)', async () => {
    const party = { id: 'p_0123456789ab', liderUid: 'u1', membros: [{ uid: 'u1', nome: 'Aria', pronto: false }], convites: [{ uid: 'u2', nome: 'Boro', por: 'Aria' }], atualizadaEm: '2026-10-21T10:00:00.000Z' };
    await repo.executarTransacao('criar', async (ctx) => {
      ctx.gravarParty(party);
      expect((await ctx.lerParty('p_0123456789ab'))?.convites).toHaveLength(1);
      expect(db.dados.size).toBe(0);
    });
    expect(db.dados.get('partys/p_0123456789ab')).toMatchObject({ liderUid: 'u1' });
    expect((await repo.lerParty('p_0123456789ab'))?.membros[0].nome).toBe('Aria');
    await repo.executarTransacao('apagar', async (ctx) => {
      ctx.apagarParty('p_0123456789ab');
      expect(await ctx.lerParty('p_0123456789ab')).toBeNull();
    });
    expect(db.dados.has('partys/p_0123456789ab')).toBe(false);
  });

  it('guarda as cartas da Alma, as equipadas, as descobertas e as moedas (7.8); dado estranho é descartado', () => {
    const carta = { id: 'c1', tipo: 'corpo-comum-1', efeitos: [{ efeito: 'forca', valor: 1 }], despertar: 0 };
    const doc = personagemParaFirestore({ ...PERSONAGEM, cartasItens: [carta as never], cartasEquipadas: ['c1'], cartasDescobertas: ['corpo-comum-1'], poeiraDeAlma: 30, cacosDeAlma: 12 });
    const volta = personagemDoFirestore('u1', doc);
    expect(volta).toMatchObject({ cartasItens: [carta], cartasEquipadas: ['c1'], cartasDescobertas: ['corpo-comum-1'], poeiraDeAlma: 30, cacosDeAlma: 12 });
    const antigo = personagemParaFirestore(PERSONAGEM);
    expect(antigo).not.toHaveProperty('cartasItens');
    expect(antigo).not.toHaveProperty('poeiraDeAlma');
    const ruim = personagemDoFirestore('u1', { ...antigo, cartasItens: [carta, { id: 'x', tipo: 'inexistente', efeitos: [] }, 5], cartasEquipadas: ['c1', 'x'], cartasDescobertas: ['lixo'], poeiraDeAlma: -5, cacosDeAlma: 'x' });
    expect(ruim.cartasItens).toEqual([carta]);
    expect(ruim.cartasEquipadas).toEqual(['c1']);
    expect(ruim.cartasDescobertas).toEqual(['corpo-comum-1']);
    expect(ruim.poeiraDeAlma).toBeUndefined();
    expect(ruim.cacosDeAlma).toBeUndefined();
  });

  it('a escolha dos equipamentos do perfil vai e volta, inclusive a lista vazia, e valores ruins são ignorados', () => {
    const volta = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, perfilEquipamentos: ['w1', 'p2'] }));
    expect(volta.perfilEquipamentos).toEqual(['w1', 'p2']);
    // lista vazia é uma escolha (todos os espaços vazios), diferente de nunca ter escolhido
    const vazia = personagemParaFirestore({ ...PERSONAGEM, perfilEquipamentos: [] });
    expect(vazia).toHaveProperty('perfilEquipamentos', []);
    expect(personagemDoFirestore('u1', vazia).perfilEquipamentos).toEqual([]);
    expect(personagemParaFirestore(PERSONAGEM)).not.toHaveProperty('perfilEquipamentos');
    expect(personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM)).perfilEquipamentos).toBeUndefined();
    const sujo = personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), perfilEquipamentos: ['a', 3, null, 'b', 'c', 'd', 'e'] });
    expect(sujo.perfilEquipamentos).toEqual(['a', 'b', 'c', 'd']);
    expect(personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), perfilEquipamentos: 'w1' }).perfilEquipamentos).toBeUndefined();
  });

  it('guarda e lê a Provação do Guerreiro (tentativas e chefes vencidos); documento antigo fica sem eles', () => {
    const comGuerreiro = { ...PERSONAGEM, guerreiroTentativas: { '1': '2026-10-14' }, guerreiroVencidas: [1, 2] };
    const volta = personagemDoFirestore('u1', personagemParaFirestore(comGuerreiro));
    expect(volta.guerreiroTentativas).toEqual({ '1': '2026-10-14' });
    expect(volta.guerreiroVencidas).toEqual([1, 2]);
    const antigo = personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM));
    expect(antigo.guerreiroTentativas).toBeUndefined();
    expect(antigo.guerreiroVencidas).toBeUndefined();
    const sujo = personagemDoFirestore('u1', { ...personagemParaFirestore(PERSONAGEM), guerreiroTentativas: { '1': 5, '2': 'ok' }, guerreiroVencidas: [1, 'x'] });
    expect(sujo.guerreiroTentativas).toEqual({ '2': 'ok' });
    expect(sujo.guerreiroVencidas).toEqual([1]);
  });

  it('guarda e lê os emblemas (itens e equipados); descarta o que é inválido e o formato antigo', () => {
    const itens = [{ id: 'a', tipo: 'dargan', estrelas: 2 }, { id: 'b', tipo: 'lautrec', estrelas: 4 }];
    const volta = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, emblemasItens: itens, emblemasEquipados: ['b'] }));
    expect(volta.emblemasItens).toEqual(itens);
    expect(volta.emblemasEquipados).toEqual(['b']);
    const vazio = personagemDoFirestore('u1', personagemParaFirestore(PERSONAGEM));
    expect(vazio.emblemasItens).toBeUndefined();
    expect(vazio.emblemasEquipados).toBeUndefined();
    const sujo = personagemDoFirestore('u1', {
      ...personagemParaFirestore(PERSONAGEM),
      emblemas: { comum: 4 },
      emblemasItens: [{ id: 'a', tipo: 'nao-existe', estrelas: 1 }, { id: 'b', tipo: 'dargan', estrelas: 4 }, { id: 'c', tipo: 'dargan', estrelas: 3 }, { id: 'c', tipo: 'dargan', estrelas: 1 }],
      emblemasEquipados: ['c', 'c', 'zzz'],
    });
    expect(sujo.emblemasItens).toEqual([{ id: 'c', tipo: 'dargan', estrelas: 3 }]);
    expect(sujo.emblemasEquipados).toEqual(['c']);
    expect(sujo).not.toHaveProperty('emblemas');
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

  it('guilda e nome da guilda: gravados no fim da transação, lidos dentro dela e apagados juntos (7.3)', async () => {
    const g = { id: 'g_abc123', nome: 'Folhaviva', nomeBusca: 'folhaviva', descricao: '', criadaEm: '1', membros: [{ uid: 'u1', nome: 'Aria', cargo: 'lider' as const, entrouEm: '1' }], convites: [], pedidos: [], quantidadeMembros: 1, xp: 0 };
    await repo.executarTransacao('criar', async (ctx) => {
      ctx.gravarGuilda(g);
      ctx.reservarNomeDeGuilda('g_x', 'g_abc123', 'Folhaviva');
      expect((await ctx.lerGuilda('g_abc123'))?.nome).toBe('Folhaviva');
      expect(await ctx.lerDonoDoNomeDeGuilda('g_x')).toBe('g_abc123');
      expect(db.dados.size).toBe(0);
    });
    expect(db.dados.get('guildas/g_abc123')).toMatchObject({ nome: 'Folhaviva', quantidadeMembros: 1 });
    expect((await repo.lerGuilda('g_abc123'))?.membros).toHaveLength(1);
    await repo.executarTransacao('desfazer', async (ctx) => {
      expect(await ctx.lerDonoDoNomeDeGuilda('g_x')).toBe('g_abc123');
      ctx.apagarGuilda('g_abc123');
      ctx.liberarNomeDeGuilda('g_x');
      expect(await ctx.lerGuilda('g_abc123')).toBeNull();
      expect(await ctx.lerDonoDoNomeDeGuilda('g_x')).toBeNull();
    });
    expect(db.dados.has('guildas/g_abc123')).toBe(false);
    expect(db.dados.has('nomesDeGuilda/g_x')).toBe(false);
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

  describe('progresso da Campanha no documento do personagem', () => {
    const progresso = {
      mapaId: 'vila',
      x: 3,
      y: 4,
      baus: ['vila:bau-1'],
      descansos: { 'vila:area-rato': 1_800_000_000_000 },
      cenas: ['abertura', 'cena:abertura', 'vila:cena-1'],
      missoes: {
        primeira: { estado: 'ativa' as const, progresso: { falar: 1, rato: 2 }, iniciadaEm: '2026-10-22T12:00:00.000Z' },
        antiga: { estado: 'concluida' as const, progresso: {}, iniciadaEm: '2026-10-20T12:00:00.000Z', concluidaEm: '2026-10-21T12:00:00.000Z' },
      },
      atualizadoEm: '2026-10-22T12:00:00.000Z',
    };

    it('descansos, cenas vistas e missões vão e voltam do banco', () => {
      const volta = personagemDoFirestore('u1', personagemParaFirestore({ ...PERSONAGEM, campanha: progresso }));
      expect(volta?.campanha).toEqual(progresso);
    });

    it('dado estranho nessas partes é descartado sem derrubar a leitura', () => {
      const doc = personagemParaFirestore({ ...PERSONAGEM, campanha: progresso }) as Record<string, unknown>;
      const sujo = {
        ...doc,
        campanha: {
          ...(doc.campanha as Record<string, unknown>),
          descansos: { bom: 5, ruim: 'x', pior: null },
          cenas: ['abertura', 7, null],
          missoes: { ok: { estado: 'ativa', progresso: { a: 1, b: 'x' }, iniciadaEm: 'agora' }, ruim: { estado: 'feita' }, lixo: 'x', nulo: null },
        },
      };
      const volta = personagemDoFirestore('u1', sujo);
      expect(volta?.campanha?.descansos).toEqual({ bom: 5 });
      expect(volta?.campanha?.cenas).toEqual(['abertura']);
      expect(volta?.campanha?.missoes).toEqual({ ok: { estado: 'ativa', progresso: { a: 1 }, iniciadaEm: 'agora' } });
    });
  });
});
