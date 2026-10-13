import type { Elemento } from '@/rules/elements';
import { HABILIDADES_ARMADURA_NO_MOTOR } from './combate/habilidadesArmaduraCombate';

/**
 * Efeitos das habilidades de armadura que a ficha de combate já aplica (parte 1: vida, defesa, Agilidade, dano fixo da
 * arma e resistência elemental; a parte 2, de dano e crítico, vive em combate/habilidadesArmaduraCombate.ts). Os textos de cada nível estão em `src/rules/habilidadesArmadura.ts`; aqui ficam os
 * números, nível a nível (índice 0 = nível 1). As habilidades que mexem em dano, crítico, status e cura entram nos
 * próximos PRs: enquanto não estiverem aqui, a ficha só as soma e avisa que ainda não valem no combate.
 *
 * Partes que dependem dos estados alterados (lentidão, "efeitos extras" de golpes de vento, terra e gelo) ainda não
 * existem no motor e ficam para o PR dos estados alterados.
 */

export interface EfeitoEstaticoArmadura {
  /** HP máximo, em % do total. */
  hpPercentual?: number;
  /** Mitigação física e mágica fixa, somada à das peças de Defesa. */
  mitigacaoFixa?: number;
  /** % sobre a mitigação das peças (soma com a % de Defesa da categoria da arma). */
  mitigacaoPercentual?: number;
  /** % sobre a Agilidade total (soma com a penalidade ou o bônus da categoria da arma). */
  agilidadePercentual?: number;
  /** % sobre o dano fixo da arma (soma com a Customização). */
  danoFixoArmaPercentual?: number;
  /** % sobre o dano fixo, só em arma sem elemento nem status. */
  danoFixoArmaSemElementoPercentual?: number;
  /** Menos dano recebido, em %, por elemento (valor positivo = resistência). */
  resistenciaElemental?: Partial<Record<Elemento, number>>;
}

const TODOS_ELEMENTOS: readonly Elemento[] = ['fogo', 'gelo', 'relampago', 'terra', 'vento', 'sagrado', 'sombrio'];

/** Resistência elemental: −3%, −6% e −10% de dano do elemento; no nível 3, mitigação +4. */
function resistencia(elemento: Elemento): (nivel: number) => EfeitoEstaticoArmadura {
  return (nivel) => ({
    resistenciaElemental: { [elemento]: [3, 6, 10][nivel - 1] },
    ...(nivel >= 3 ? { mitigacaoFixa: 4 } : {}),
  });
}

const por = <T>(valores: readonly T[], nivel: number): T | undefined => valores[Math.min(nivel, valores.length) - 1];

const EFEITOS: Readonly<Record<string, (nivel: number) => EfeitoEstaticoArmadura>> = {
  'reforco-de-vida': (n) => ({ hpPercentual: por([3, 6, 10], n) }),
  'reforco-de-defesa': (n) => {
    const todos = por([0, 0, 0, 1, 1, 2, 2], n) ?? 0;
    return {
      mitigacaoFixa: por([2, 4, 4, 8, 8, 14, 14], n),
      mitigacaoPercentual: por([0, 0, 5, 5, 8, 8, 10], n),
      ...(todos > 0 ? { resistenciaElemental: Object.fromEntries(TODOS_ELEMENTOS.map((e) => [e, todos])) } : {}),
    };
  },
  'extensor-de-agilidade': (n) => ({ agilidadePercentual: por([3, 6, 10], n) }),
  'mobilidade-aquatica-polar': (n) => ({ agilidadePercentual: por([0, 5, 10], n) }),
  artesanato: (n) => ({ danoFixoArmaPercentual: por([3, 6, 9, 12, 15], n) }),
  'reforco-nao-elemental': () => ({ danoFixoArmaSemElementoPercentual: 10 }),
  'resistencia-a-fogo': resistencia('fogo'),
  'resistencia-a-agua': resistencia('vento'),
  'resistencia-a-gelo': resistencia('gelo'),
  'resistencia-a-raio': resistencia('relampago'),
  'resistencia-a-dragao': resistencia('sombrio'),
  // Nível 5 anula o dano de vento (imunidade); o 4 reduz 50%
  antivento: (n) => ({ resistenciaElemental: { vento: por([10, 20, 35, 50, 90], n) } }),
  'resistencia-a-tremor': (n) => ({ resistenciaElemental: { terra: por([0, 20, 40], n) } }),
  antifrio: () => ({ resistenciaElemental: { gelo: 50 } }),
  // Tormenta de Reydras nível 3: −5% de dano de Relâmpago recebido (o resto vive no motor)
  'tormenta-de-reydras': (n) => (n >= 3 ? { resistenciaElemental: { relampago: 5 } } : {}),
};

/** Habilidades que entram na ficha de combate (vida, defesa, Agilidade, dano fixo e resistência elemental). */
export const HABILIDADES_ARMADURA_ESTATICAS: ReadonlySet<string> = new Set(Object.keys(EFEITOS));

/** As habilidades de armadura que o combate já aplica: as estáticas da ficha e as que dependem do estado da luta. */
export const HABILIDADES_ARMADURA_APLICADAS: ReadonlySet<string> = new Set([...HABILIDADES_ARMADURA_ESTATICAS, ...HABILIDADES_ARMADURA_NO_MOTOR]);

export function efeitoEstaticoDaHabilidade(id: string, nivel: number): EfeitoEstaticoArmadura | undefined {
  const f = EFEITOS[id] as ((nivel: number) => EfeitoEstaticoArmadura) | undefined;
  return f && nivel >= 1 ? f(nivel) : undefined;
}

export interface EfeitosEstaticosSomados {
  hpPercentual: number;
  mitigacaoFixa: number;
  mitigacaoPercentual: number;
  agilidadePercentual: number;
  danoFixoArmaPercentual: number;
  danoFixoArmaSemElementoPercentual: number;
  resistenciaElemental: Partial<Record<Elemento, number>>;
}

/** Soma os efeitos de todas as habilidades (já com os níveis somados entre as peças). Tudo aditivo (regra 1.2.2). */
export function somarEfeitosEstaticos(habilidades: Readonly<Record<string, number>>): EfeitosEstaticosSomados {
  const total: EfeitosEstaticosSomados = {
    hpPercentual: 0, mitigacaoFixa: 0, mitigacaoPercentual: 0, agilidadePercentual: 0,
    danoFixoArmaPercentual: 0, danoFixoArmaSemElementoPercentual: 0, resistenciaElemental: {},
  };
  for (const [id, nivel] of Object.entries(habilidades)) {
    const e = efeitoEstaticoDaHabilidade(id, nivel);
    if (!e) continue;
    total.hpPercentual += e.hpPercentual ?? 0;
    total.mitigacaoFixa += e.mitigacaoFixa ?? 0;
    total.mitigacaoPercentual += e.mitigacaoPercentual ?? 0;
    total.agilidadePercentual += e.agilidadePercentual ?? 0;
    total.danoFixoArmaPercentual += e.danoFixoArmaPercentual ?? 0;
    total.danoFixoArmaSemElementoPercentual += e.danoFixoArmaSemElementoPercentual ?? 0;
    for (const [el, v] of Object.entries(e.resistenciaElemental ?? {})) {
      total.resistenciaElemental[el as Elemento] = (total.resistenciaElemental[el as Elemento] ?? 0) + (v ?? 0);
    }
  }
  return total;
}
