import { describe, it, expect } from 'vitest';
import {
  CONQUISTAS,
  conquistasDoDocumento,
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
  it('14 conquistas em 3 categorias, 5 degraus com metas crescentes; os títulos existem', () => {
    expect(CONQUISTAS).toHaveLength(14);
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

  it('recompensa por degrau: 3/5/10/20/40 Diamantes e selos que crescem; Expedição e Buscas trocam parte dos selos por Avanços', () => {
    const v = CONQUISTA_MAP.vitorias;
    expect([0, 1, 2, 3, 4].map((d) => recompensaDoDegrau(v, d))).toEqual([
      { diamantes: 3, selos: {}, avancosDeExpedicao: 0 },
      { diamantes: 5, selos: { desgastado: 10 }, avancosDeExpedicao: 0 },
      { diamantes: 10, selos: { encantado: 5 }, avancosDeExpedicao: 0 },
      { diamantes: 20, selos: { eternidade: 3 }, avancosDeExpedicao: 0 },
      { diamantes: 40, selos: { origem: 1 }, avancosDeExpedicao: 0, titulo: 'veterano-de-guerra' },
    ]);
    const e = CONQUISTA_MAP.expedicao;
    expect([0, 1, 2, 3, 4].map((d) => [recompensaDoDegrau(e, d).selos, recompensaDoDegrau(e, d).avancosDeExpedicao])).toEqual([
      [{}, 1],
      [{}, 2],
      [{}, 3],
      [{ eternidade: 3 }, 5],
      [{ origem: 1 }, 10],
    ]);
    // Nível não dá título
    expect(recompensaDoDegrau(CONQUISTA_MAP.nivel, 4).titulo).toBeUndefined();
    // tudo junto: 78 Diamantes por conquista, 1.092 no total
    const total = somarRecompensas(CONQUISTAS.flatMap((c) => [0, 1, 2, 3, 4].map((d) => recompensaDoDegrau(c, d))));
    expect(total.diamantes).toBe(1092);
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
      estatisticas: { vitorias: 150, vitoriasContraChefes: 4, forjas: 5, expedicoes: 9, buscas: 10, diasDeChefeMundial: 1 },
    });
    const p = Object.fromEntries(CONQUISTAS.map((c) => [c.id, c.progresso(f)]));
    expect(p).toEqual({ vitorias: 150, chefes: 4, nivel: 16, torre: 120, guerreiro: 3, batalhaSangrenta: 1, testeEquipe: 2, chefeMundial: 1, forja: 5, expedicao: 9, colecionaveis: 1, buscas: 10, maestria: 27, alma: 6 });
    expect(degrausBatidos(CONQUISTA_MAP.vitorias, 150)).toBe(2);
    expect(degrausBatidos(CONQUISTA_MAP.torre, 300)).toBe(5);
    // vitórias 2, nível 3, torre 3, guerreiro 2, batalha 1, teste 1, chefe mundial 1, forja 2, expedição 1, colecionáveis 1, buscas 1, maestria 2, alma 1
    expect(degrausProntos(f, undefined)).toBe(21);
    expect(degrausProntos(f, { vitorias: 2, nivel: 1 })).toBe(18);
    expect(degrausProntos(ficha(), undefined)).toBe(0);
  });

  it('vitrine do perfil: as 4 mais avançadas', () => {
    expect(conquistasEmDestaque({ nivel: 3, torre: 5, vitorias: 1, forja: 2, alma: 1 })).toEqual([
      { nome: 'Torre Celestial', degraus: 5 },
      { nome: 'Nível', degraus: 3 },
      { nome: 'Forja', degraus: 2 },
      { nome: 'Vitórias', degraus: 1 },
    ]);
    expect(conquistasEmDestaque(undefined)).toEqual([]);
  });

  it('textos', () => {
    expect(textoDaMeta(CONQUISTA_MAP.vitorias, 4)).toBe('Vença 10.000 lutas');
    // metas de 1 no singular
    for (const c of CONQUISTAS) if (c.metas[0] === 1) expect(textoDaMeta(c, 0), c.id).not.toMatch(/ 1 \S+s\b/);
    expect(textoDaMeta(CONQUISTA_MAP.chefeMundial, 0)).toBe('Lute em 1 dia');
    expect(textoDaMeta(CONQUISTA_MAP.chefeMundial, 1)).toBe('Lute em 5 dias');
    expect(textoDaRecompensaDeConquista(recompensaDoDegrau(CONQUISTA_MAP.torre, 4))).toEqual(['40 Diamantes', '1× Selo da Origem', 'Título: Conquistador da Torre']);
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
