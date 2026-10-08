import { GAME_CONFIG } from '@/rules/config';
import type { AplicacaoBuff } from './efeitosBuffs';
import type { AplicacaoEfeitoDefensivo } from './efeitosDefensivos';
import type { DefinicaoHabilidade, ResultadoHabilidade } from './habilidades/tipos';
import type { Elemento } from '@/rules/elements';

/**
 * Habilidades raciais ativas (roadmap 1.8.1). Disparam sozinhas quando o HP de quem as tem fica abaixo de 50%,
 * sem custo, e só voltam a disparar depois de 8 rodadas. Os valores seguem o texto de src/rules/races.ts.
 *
 * - Humano, Anão, Elfo e Orc: buffs que valem já na ação em que disparam.
 * - Vampiro e Draconiano: no lugar do ataque daquela ação, um ataque mágico por Inteligência.
 */
export interface RacialDeBuff {
  tipo: 'buff';
  nome: string;
  buffs: AplicacaoBuff[];
  efeitosDefensivos?: AplicacaoEfeitoDefensivo[];
}

export interface RacialDeAtaque {
  tipo: 'ataque';
  nome: string;
}

export type HabilidadeRacial = RacialDeBuff | RacialDeAtaque;

const aumento = (atributo: 'forca' | 'vitalidade' | 'agilidade' | 'inteligencia' | 'arcano' | 'vigor', valor: number, rodadas: number): AplicacaoBuff => ({
  tipo: 'atributo',
  atributo: atributo,
  valor,
  rodadas,
});

export const HABILIDADES_RACIAIS: Readonly<Record<string, HabilidadeRacial>> = {
  humano: {
    tipo: 'buff',
    nome: 'Instinto de Sobrevivência',
    buffs: [aumento('forca', 2, 2), aumento('vitalidade', 2, 2), aumento('agilidade', 1, 2)],
  },
  anao: {
    tipo: 'buff',
    nome: 'Fúria da Forja',
    buffs: [aumento('forca', 3, 3), aumento('vitalidade', 2, 3), aumento('agilidade', -2, 3)],
    efeitosDefensivos: [{ efeito: 'resistenciaFisica', valorPercentual: 20, duracaoRodadas: 3 }],
  },
  elfo: {
    tipo: 'buff',
    nome: 'Graça de Alfheim',
    buffs: [
      aumento('inteligencia', 3, 3),
      aumento('agilidade', 2, 3),
      aumento('arcano', 2, 3),
      { tipo: 'bonusDano', percentual: 15, tipoDano: 'magico', rodadas: 3 },
    ],
  },
  orc: {
    tipo: 'buff',
    nome: 'Fúria Orc',
    buffs: [
      aumento('forca', 4, 3),
      aumento('vigor', 2, 3),
      aumento('agilidade', -2, 3),
      { tipo: 'bonusDano', percentual: 10, tipoDano: 'fisico', rodadas: 3 },
    ],
  },
  vampiro: { tipo: 'ataque', nome: 'Drenar Sangue' },
  draconiano: { tipo: 'ataque', nome: 'Sopro Dracônico' },
};

export function obterHabilidadeRacial(racaId: string | undefined): HabilidadeRacial | undefined {
  return racaId ? HABILIDADES_RACIAIS[racaId] : undefined;
}

/** Dispara quando o HP está abaixo do limite (50%) e a recarga acabou. */
export function racialDeveDisparar(params: {
  racaId?: string;
  hp: number;
  hpMax: number;
  recargaRestante?: number;
}): boolean {
  if (!obterHabilidadeRacial(params.racaId)) return false;
  if ((params.recargaRestante ?? 0) > 0) return false;
  if (params.hp <= 0 || params.hpMax <= 0) return false;
  return (params.hp * 100) / params.hpMax < GAME_CONFIG.LIMITE_HP_RACIAL_PERCENTUAL;
}

const ELEMENTOS_LINHAGEM: readonly Elemento[] = ['fogo', 'gelo', 'relampago', 'terra', 'vento'];

export function elementoDaLinhagem(linhagem: string | undefined): Elemento | undefined {
  return ELEMENTOS_LINHAGEM.find((e) => e === linhagem);
}

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano'> = {
  percentualDano: 100,
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/**
 * Drenar Sangue: dano mágico por Inteligência; cura 50% do dano causado (75% se o alvo estiver abaixo de 30% do HP).
 * Sopro Dracônico: dano mágico por Inteligência no elemento da linhagem; o efeito extra depende da linhagem.
 */
export function definicaoRacialDeAtaque(
  racaId: string,
  linhagem: string | undefined
): { definicao: DefinicaoHabilidade; elemento?: Elemento } | undefined {
  if (racaId === 'vampiro') {
    return {
      definicao: {
        id: 'racial_vampiro_drenar_sangue',
        espaco: 'basico',
        tipoDano: 'magico',
        executar: (ctx) => ({
          ...BASE,
          nome: 'Drenar Sangue',
          tipoDano: 'magico',
          curaPercentualDanoCausado: (ctx.alvo.hp * 100) / Math.max(1, ctx.alvo.hpMax) < 30 ? 75 : 50,
        }),
      },
    };
  }
  if (racaId === 'draconiano') {
    const elemento = elementoDaLinhagem(linhagem);
    return {
      definicao: {
        id: 'racial_draconiano_sopro_draconico',
        espaco: 'basico',
        tipoDano: 'magico',
        executar: () => ({
          ...BASE,
          nome: 'Sopro Dracônico',
          tipoDano: 'magico',
          ...(elemento === 'gelo' ? { efeitosNoAlvo: [{ tipo: 'exaustao' as const, percentual: 30, rodadas: 3 }] } : {}),
          ...(elemento === 'terra' ? { efeitosNoAlvo: [{ tipo: 'reducaoDefesa' as const, percentual: 20, rodadas: 3 }] } : {}),
          ...(elemento === 'vento'
            ? { buffs: [{ tipo: 'atributo' as const, atributo: 'agilidade' as const, valor: 2, rodadas: 3 }] }
            : {}),
        }),
      },
      elemento,
    };
  }
  return undefined;
}
