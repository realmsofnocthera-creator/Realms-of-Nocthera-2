import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_DE_CONQUISTA,
  CONQUISTAS,
  conquistasDoDocumento,
  RARIDADE_DO_DEGRAU,
  degrausBatidos,
  degrausProntos,
  estatisticasDoDocumento,
  recompensaDoDegrau,
  somarEstatisticas,
  somarRecompensas,
  textoDaMeta,
  textoDaRecompensaDeConquista,
  TOTAL_DE_CARTAS,
  TOTAL_DE_TESTES,
  CONQUISTA_MAP,
  conquistasEmDestaque,
  type FichaDeConquistas,
} from '@/rules/conquistas';
import { presenteDoDocumento, textoDoPresente } from '@/rules/correio';
import { xpAteONivel } from '@/rules/maestrias';
import { comTitulos, TITULO_MAP, TITULOS, titulosDoDocumento } from '@/rules/titulos';

const ficha = (extra: Partial<FichaDeConquistas> = {}): FichaDeConquistas => ({ nivel: 1, ...extra });

describe('Conquistas: regras', () => {
  it('74 conquistas (fases 1 a 5 da lista nova) em 7 categorias, 5 degraus com metas crescentes; os títulos existem', () => {
    expect(CONQUISTAS).toHaveLength(74);
    expect(CONQUISTAS.filter((c) => c.categoria === 'monstros')).toHaveLength(18);
    expect(CATEGORIAS_DE_CONQUISTA).toHaveLength(7);
    for (const c of CONQUISTAS) expect(CATEGORIAS_DE_CONQUISTA, c.id).toContain(c.categoria);
    expect(CONQUISTAS.filter((c) => c.categoria === 'comunidade')).toHaveLength(9);
    expect(RARIDADE_DO_DEGRAU).toEqual(['bronze', 'bronze', 'prata', 'ouro', 'diamante']);
    for (const c of CONQUISTAS) {
      expect(c.metas, c.id).toHaveLength(5);
      for (let i = 1; i < 5; i++) expect(c.metas[i], c.id).toBeGreaterThan(c.metas[i - 1]);
      if (c.titulo) expect(TITULO_MAP[c.titulo], c.id).toBeDefined();
    }
    expect(CONQUISTAS.filter((c) => c.titulo)).toHaveLength(12);
    expect(TOTAL_DE_TESTES).toBe(18);
    expect(TOTAL_DE_CARTAS).toBe(54);
    // os títulos de conquista, o do Chefe Mundial, os 10 dos ranques da Arena ranqueada e os 4 do campeão
    expect(TITULOS).toHaveLength(27);
  });

  it('recompensa por degrau: 1/1/2/3/5 Diamantes e selos só nos dois últimos; Expedição e Buscas dão Avanços', () => {
    const v = CONQUISTA_MAP.vitorias;
    expect([0, 1, 2, 3, 4].map((d) => recompensaDoDegrau(v, d))).toEqual([
      { diamantes: 1, selos: {}, avancosDeExpedicao: 0 },
      { diamantes: 1, selos: {}, avancosDeExpedicao: 0 },
      { diamantes: 2, selos: {}, avancosDeExpedicao: 0 },
      { diamantes: 3, selos: { desgastado: 2 }, avancosDeExpedicao: 0 },
      { diamantes: 5, selos: { encantado: 1 }, avancosDeExpedicao: 0, titulo: 'veterano-de-guerra' },
    ]);
    const e = CONQUISTA_MAP.expedicao;
    expect([0, 1, 2, 3, 4].map((d) => [recompensaDoDegrau(e, d).selos, recompensaDoDegrau(e, d).avancosDeExpedicao])).toEqual([
      [{}, 1],
      [{}, 1],
      [{}, 1],
      [{ desgastado: 2 }, 2],
      [{ encantado: 1 }, 3],
    ]);
    // Nível não dá título
    expect(recompensaDoDegrau(CONQUISTA_MAP.nivel, 4).titulo).toBeUndefined();
    // tudo junto: 12 Diamantes por conquista (eram 78), 888 no total
    const total = somarRecompensas(CONQUISTAS.flatMap((c) => [0, 1, 2, 3, 4].map((d) => recompensaDoDegrau(c, d))));
    expect(total.diamantes).toBe(74 * 12);
    expect(total.titulos).toHaveLength(12);
  });

  it('o progresso lê o personagem e os totais contados', () => {
    const f = ficha({
      nivel: 16,
      torreAndar: 120,
      guerreiroVencidas: [1, 2, 3],
      batalhaSangrentaVencidas: ['facil'],
      testeEquipeConcluidas: ['alma:1', 'corpo:1'],
      colecionaveis: { 'RI-C01': { fragmentos: 0, nivel: 1 }, 'RI-C02': { nivel: 0, fragmentos: 5 } },
      maestrias: { 'arma:katana': { xp: xpAteONivel(27) }, forja: { xp: xpAteONivel(12) } },
      cartasDescobertas: ['a', 'b', 'c', 'd', 'e', 'f'],
      estatisticas: { vitorias: 150, vitoriasContraChefes: 4, forjas: 5, expedicoes: 9, buscas: 10, diasDeChefeMundial: 1, vitoriasFogo: 12, vitoriasGelo: 60, vitoriasVidaCheia: 2, vitoriasNoLimite: 1, golpesCriticos: 30, danoCausado: 6000, statusAplicados: 15, contratosDeGuilda: 12, semanasDeChefeDeGuilda: 5, doacoesDePesquisa: 1, lutasEmParty: 45, vendasNoMercado: 3, comprasNoMercado: 22, presentesDoCorreio: 9, danoNoChefeMundial: 60000, topsDoChefeMundial: 4, vitoriasBatalhaSangrenta: 11, vitoriasDoGuerreiro: 2, chavesDeProvacaoUsadas: 6, armasForjadas: 6, armadurasForjadas: 1, reforjas: 12, emblemasFundidos: 0, ouroNaForja: 25000, materiaisNaForja: 130, lutasPvp: 130, vitoriasPvp: 55, maiorSequenciaPvp: 5, vitoriasContraNivelMaior: 6, danoPvp: 120000, viradasPvp: 2 },
      monstrosDerrotados: ['rato-da-floresta', 'rato-das-cinzas', 'darius-carrasco-escarlate'],
      vocacoesDerrotadasPvp: ['barbaro', 'samurai', 'profeta'],
      guildaDesde: new Date(Date.now() - 40 * 86_400_000 - 3_600_000).toISOString(),
      chefeSemanal: [{}, {}],
      reforcoHabilidade: 9,
      ascensaoHabilidade: 2,
      subclasseTiers: { a: 1, b: 0, c: 4 },
      emblemasItens: [1, 2],
      titulos: ['x'],
      armas: [1],
      armaduras: [1, 2],
      inventario: { a: 1, b: 0, c: 2 },
      campanha: { baus: ['1', '2'], cenas: ['a'], missoes: { m1: { estado: 'concluida' }, m2: { estado: 'ativa' } } },
      selosDoAbismo: 3,
      arena: [{ premiada: true }, {}],
      ranqueada: [{ premiada: true }, { premiada: true }],
      campeonatos: ['a', 'b', 'c'],
      campeonatosVencidos: 1,
      cacadaChavesVencidas: [1, 2, 3],
    });
    const p = Object.fromEntries(CONQUISTAS.map((c) => [c.id, c.progresso(f)]));
    expect(p).toEqual({
      nivel: 16, maestria: 27, reforco: 9, ascensao: 2, subclasses: 2, emblemas: 2, colecionaveis: 1, alma: 6, titulos: 1,
      vitorias: 150, chefes: 4, cacada: 3,
      bestiario: 3, subespecies: 1, chefesEspeciais: 1,
      elemento_fogo: 12, elemento_gelo: 60, elemento_relampago: 0, elemento_terra: 0, elemento_vento: 0, elemento_sagrado: 0, elemento_sombrio: 0,
      intocavel: 2, noLimite: 1, criticos: 30, destruidor: 6000, statusAplicados: 15,
      guildaDias: 40, contratos: 12, incursoes: 0, chefeDaGuilda: 5, pesquisa: 1, party: 45, vendas: 3, compras: 22, correio: 9,
      armeiro: 6, armadureiro: 1, reforjas: 12, fusaoDeEmblemas: 0, maoDeObra: 25000, fornalha: 130,
      golpeDeSoberano: 60000, destaqueMundial: 4, sedeDeSangue: 11, duelista: 2, chavesDaProvacao: 6,
      gladiador: 130, vitoriasPvp: 55, sequenciaPvp: 5, zebra: 6, todasAsVocacoes: 3, danoPvp: 120000, virada: 2,
      forja: 5, arsenal: 1, guardaRoupa: 2, materiais: 2,
      expedicao: 9, buscas: 10, baus: 2, cenas: 1, missoesCampanha: 1,
      torre: 120, guerreiro: 3, batalhaSangrenta: 1, testeEquipe: 2, chefeMundial: 1, provacoesDiferentes: 5, abismo: 3,
      arenaSemanas: 1, ranqueadaSemanas: 2, campeonatos: 3, campeonatosVencidos: 1,
    });
    expect(degrausBatidos(CONQUISTA_MAP.vitorias, 150)).toBe(2);
    expect(degrausBatidos(CONQUISTA_MAP.torre, 300)).toBe(5);
    // soma dos degraus batidos de todas as conquistas: 107 (vitórias 2, nível 3, torre 3, Provado em tudo 5, Em grupo 3, Mão de obra 2…)
    expect(degrausProntos(f, undefined)).toBe(107);
    expect(degrausProntos(f, { vitorias: 2, nivel: 1 })).toBe(104);
    expect(degrausProntos(ficha(), undefined)).toBe(0);
  });

  it('vitrine do perfil: as 4 mais avançadas', () => {
    // empate no 1: vale a ordem da lista (Alma vem antes de Vitórias)
    expect(conquistasEmDestaque({ nivel: 3, torre: 5, vitorias: 1, forja: 2, alma: 1 })).toEqual([
      { nome: 'Torre Celestial', degraus: 5 },
      { nome: 'Nível', degraus: 3 },
      { nome: 'Forja', degraus: 2 },
      { nome: 'Alma', degraus: 1 },
    ]);
    expect(conquistasEmDestaque(undefined)).toEqual([]);
  });

  it('textos', () => {
    expect(textoDaMeta(CONQUISTA_MAP.vitorias, 4)).toBe('Vença 10.000 lutas');
    // metas de 1 no singular
    for (const c of CONQUISTAS) if (c.metas[0] === 1) expect(textoDaMeta(c, 0), c.id).not.toMatch(/ 1 \p{L}+s(?!\p{L})/u);
    expect(textoDaMeta(CONQUISTA_MAP.chefeMundial, 0)).toBe('Lute em 1 dia');
    expect(textoDaMeta(CONQUISTA_MAP.chefeMundial, 1)).toBe('Lute em 5 dias');
    expect(textoDaRecompensaDeConquista(recompensaDoDegrau(CONQUISTA_MAP.torre, 4))).toEqual(['5 Diamantes', '1× Selo Encantado', 'Título: Conquistador da Torre']);
  });

  it('leituras tolerantes do banco e somas', () => {
    expect(conquistasDoDocumento({ vitorias: 3, torre: 9, xyz: 2, nivel: 0 })).toEqual({ vitorias: 3, torre: 5 });
    expect(conquistasDoDocumento([])).toBeUndefined();
    expect(estatisticasDoDocumento({ vitorias: 12.6, buscas: -1, outra: 5 })).toEqual({ vitorias: 12 });
    expect(somarEstatisticas({ vitorias: 2 }, { vitorias: 3, forjas: 1, buscas: 0 })).toEqual({ vitorias: 5, forjas: 1 });
    expect(titulosDoDocumento(['maestre', 'maestre', 'falso', 7])).toEqual(['maestre']);
    expect(comTitulos(['maestre'], ['maestre', 'sanguinario', 'falso'])).toEqual(['maestre', 'sanguinario']);
  });

  it('o Correio leva títulos', () => {
    expect(presenteDoDocumento({ titulos: ['campeao-do-chefe-mundial', 'falso'] })).toEqual({ titulos: ['campeao-do-chefe-mundial'] });
    expect(presenteDoDocumento({ titulos: ['falso'] })).toBeUndefined();
    expect(textoDoPresente({ diamantes: 5, titulos: ['maestre'] })).toEqual(['5 Diamantes', 'Título: Maestre']);
  });
});
