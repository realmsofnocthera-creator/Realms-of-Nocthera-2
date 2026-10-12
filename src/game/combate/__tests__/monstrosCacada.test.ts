import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import type { MonsterDefinition } from '@/rules/monsters';

/** Caçada — peças novas dos monstros: habilidade a cada N ataques, Enfurecido e imunidade a status. */

const alvo = (extra: Partial<Combatente> = {}): Combatente => ({
  nome: 'Caçador',
  hp: 5000,
  hpMax: 5000,
  sobreescudo: 0,
  atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
  ...extra,
});

const monstro = (extra: Partial<Combatente> = {}): Combatente => ({
  nome: 'Fera',
  hp: 100,
  hpMax: 100,
  sobreescudo: 0,
  atributos: { vigor: 20, sorte: 0, forca: 10, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
  ...extra,
});

const ataque = (m: Combatente, a: Combatente = alvo()) => turnoDeCombate(m, a, 1).turnoLog.ataques[0];

describe('Habilidade de monstro (a cada N ataques)', () => {
  it('dispara no 3º ataque, no lugar do ataque básico, e volta a contar', () => {
    const m = monstro({ habilidadesMonstro: [{ aCada: 3, acoes: [{ nome: 'Patada Pesada', efeito: { percentualDano: 200 } }] }] });
    const log = [1, 2, 3, 4, 5, 6].map(() => ataque(m));
    expect(log.map((a) => a.habilidadeAcionada ?? 'básico')).toEqual(['básico', 'básico', 'Patada Pesada', 'básico', 'básico', 'Patada Pesada']);
    expect(log[0].danoBruto).toBe(10);
    expect(log[2].danoBruto).toBe(20);
  });

  it('com duas ações, elas se alternam a cada disparo', () => {
    const m = monstro({
      habilidadesMonstro: [{ aCada: 2, acoes: [{ nome: 'Agarrão', efeito: {} }, { nome: 'Esmagamento', efeito: {} }] }],
    });
    const nomes = [1, 2, 3, 4, 5, 6].map(() => ataque(m).habilidadeAcionada ?? 'básico');
    expect(nomes).toEqual(['básico', 'Agarrão', 'básico', 'Esmagamento', 'básico', 'Agarrão']);
  });

  it('se duas ficam prontas juntas, vai a mais rara e a outra dispara no ataque seguinte', () => {
    const m = monstro({
      habilidadesMonstro: [
        { aCada: 2, acoes: [{ nome: 'Golpe Duplo', efeito: { numeroGolpes: 2 } }] },
        { aCada: 4, acoes: [{ nome: 'Chuva de Rochas', efeito: { ignorarDefesaPercentual: 100 } }] },
      ],
    });
    const log = [1, 2, 3, 4, 5].map(() => ataque(m));
    expect(log.map((a) => a.habilidadeAcionada ?? 'básico')).toEqual(['básico', 'Golpe Duplo', 'básico', 'Chuva de Rochas', 'Golpe Duplo']);
    expect(log[1].golpes).toHaveLength(2);
  });

  it('efeitos do catálogo: Distração no caçador', () => {
    const m = monstro({ habilidadesMonstro: [{ aCada: 1, acoes: [{ nome: 'Onda Sonora', efeito: { efeitosNoAlvo: [{ tipo: 'distracao', acoes: 1 }] } }] }] });
    const c = alvo();
    ataque(m, c);
    expect(c.debuffs?.some((d) => d.tipo === 'distracao')).toBe(true);
  });

  it('monstro sem habilidades continua igual (só ataque básico)', () => {
    const log = [1, 2, 3].map(() => ataque(monstro()));
    expect(log.every((a) => a.habilidadeAcionada === undefined && a.danoBruto === 10)).toBe(true);
  });
});

describe('Enfurecido', () => {
  it('abaixo de 50% de HP ganha +20% de dano e o log marca', () => {
    expect(ataque(monstro({ enfurecido: true, hp: 50 })).danoBruto).toBe(10); // 50% exatos: ainda não
    const a = ataque(monstro({ enfurecido: true, hp: 49 }));
    expect(a.danoBruto).toBe(12);
    expect(a.enfurecidoAtivo).toBe(true);
    expect(ataque(monstro({ hp: 10 })).danoBruto).toBe(10); // sem a peça, nada muda
  });

  it('soma com o bônus da habilidade no mesmo grupo', () => {
    const m = monstro({ enfurecido: true, hp: 40, habilidadesMonstro: [{ aCada: 1, acoes: [{ nome: 'Fúria', efeito: { percentualDano: 150 } }] }] });
    expect(ataque(m).danoBruto).toBe(18); // 10 × 150% × 1,2
  });
});

describe('Imunidade a status e status das habilidades no caçador (combate completo)', () => {
  const base: MonsterDefinition = {
    id: 'teste', nome: 'Esqueleto de Teste', nivel: 1, hp: 3000, categoriaCorporal: 'feral',
    atributos: { vigor: 1, sorte: 0, forca: 3, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    xpConcedido: 0, ouroConcedido: { min: 0, max: 0 },
  };
  const berserker: Combatente = {
    nome: 'Berserker', racaId: 'humano', classeId: 'barbaro', nivel: 30, hp: 3000, hpMax: 3000, sobreescudo: 0,
    atributos: { vigor: 50, sorte: 0, forca: 30, vitalidade: 5, arcano: 0, inteligencia: 0, agilidade: 1 },
    subclasseAtualId: 'berserker', subclasseTiers: { berserker: 4 },
    habilidadesEquipadas: { ataqueBasico: 'barbaro_golpe_barbaro', habilidadeEspecial: 'berserker_investida_sangrenta', ultimate: 'barbaro_ira_do_barbaro' },
  };
  const eventos = (r: ReturnType<typeof resolverCombate>) => r.logTurnos.flatMap((t) => t.eventosEfeitos ?? []);

  it('monstro imune a Sangramento não sangra', () => {
    const normal = eventos(resolverCombate(structuredClone(berserker), base, 7));
    const imune = eventos(resolverCombate(structuredClone(berserker), { ...base, imunidadesStatus: ['sangramento'] }, 7));
    // Sangramento é instantâneo (dano de uma vez, dura até o fim da luta)
    expect(normal.some((e) => e.efeito === 'sangramento' && e.tipo === 'instantaneo')).toBe(true);
    expect(imune.some((e) => e.efeito === 'sangramento' && e.tipo === 'instantaneo')).toBe(false);
    expect(imune.some((e) => e.efeito === 'sangramento' && e.tipo === 'imune')).toBe(true);
  });

  it('habilidade do monstro com status garantido aplica no caçador', () => {
    const r = resolverCombate(structuredClone(berserker), {
      ...base,
      habilidades: [{ aCada: 2, acoes: [{ nome: 'Sopro de Fogo', efeito: { statusForcadosNoAlvo: ['queimadura'] } }] }],
    }, 3);
    const ataquesMonstro = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Esqueleto de Teste');
    expect(ataquesMonstro.some((a) => a.habilidadeAcionada === 'Sopro de Fogo')).toBe(true);
    expect(eventos(r).some((e) => e.efeito === 'queimadura' && (e.tipo === 'aplicado' || e.tipo === 'renovado'))).toBe(true);
  });

  it('é determinístico', () => {
    const m = { ...base, enfurecido: true, habilidades: [{ aCada: 3, acoes: [{ nome: 'X', efeito: { numeroGolpes: 2 } }] }] };
    expect(resolverCombate(structuredClone(berserker), m, 11)).toEqual(resolverCombate(structuredClone(berserker), m, 11));
  });
});
