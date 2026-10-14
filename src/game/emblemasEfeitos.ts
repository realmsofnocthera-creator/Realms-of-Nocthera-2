import { ELEMENTOS, Elemento } from '@/rules/elements';
import { CondicaoDoEfeito, EFEITOS_DOS_EMBLEMAS, EventoGatilho, ResultadoGatilho } from '@/rules/emblemasEfeitos';
import { TIPO_EMBLEMA_MAP } from '@/rules/emblemasCatalogo';
import { EmblemaItem, multiplicadorDoNivel, nivelDasHabilidades } from './emblemas';

/** Os efeitos fixos dos emblemas equipados, já com o multiplicador do nível de cada habilidade. */
export interface EfeitosEstaticosDosEmblemas {
  atqPercentual: number;
  defPercentual: number;
  hpPercentual: number;
  iniciativaPercentual: number;
  criticoPontos: number;
  danoElemental: Partial<Record<Elemento, number>>;
  resistenciaElemental: Partial<Record<Elemento, number>>;
  reducaoDano: { fisico: number; magico: number; todos: number; chefes: number };
  /** Efeitos que dependem do estado da luta (a condição é avaliada pelo motor a cada golpe). */
  danoSe: ComCondicao[];
  danoElementalSe: (ComCondicao & { elemento: Elemento })[];
  danoCritico: ComCondicao[];
  /** Pontos extras de chance de crítico enquanto a condição valer (o `percentual` aqui são pontos). */
  criticoSe: ComCondicao[];
  ignorarDefesa: ComCondicao[];
  danoGolpesSeguidosPercentual: number;
  chanceAtaqueAdicional: number;
  /** Habilidades que disparam com um acontecimento da luta. */
  gatilhos: GatilhoNoCombate[];
  danoStatus: { veneno: number; sangramento: number; queimadura: number };
  duracaoStatus: { veneno: number; controle: number };
  chanceStatus: { congelamento: number; sono: number };
  resistenciaStatusPercentual: number;
  reducaoDanoDeAfetados: { veneno: number; negativo: number };
}

/**
 * Gatilho com os valores já no nível da habilidade. O multiplicador do nível vale para cura, escudo, dano extra e
 * bônus de dano, DEF e redução; chance, limites, duração e usos ficam como estão na tabela.
 */
export interface GatilhoNoCombate {
  /** Identifica a habilidade (`tipo:índice`): é a chave dos usos e das pilhas. */
  id: string;
  nome: string;
  quando: EventoGatilho;
  chance?: number;
  usosPorCombate?: number;
  umaVezPorRodada?: boolean;
  resultado: ResultadoGatilho;
}

export interface ComCondicao {
  percentual: number;
  condicao: CondicaoDoEfeito;
}

export function efeitosVazios(): EfeitosEstaticosDosEmblemas {
  return {
    atqPercentual: 0,
    defPercentual: 0,
    hpPercentual: 0,
    iniciativaPercentual: 0,
    criticoPontos: 0,
    danoElemental: {},
    resistenciaElemental: {},
    reducaoDano: { fisico: 0, magico: 0, todos: 0, chefes: 0 },
    danoSe: [],
    danoElementalSe: [],
    danoCritico: [],
    criticoSe: [],
    ignorarDefesa: [],
    danoGolpesSeguidosPercentual: 0,
    chanceAtaqueAdicional: 0,
    gatilhos: [],
    danoStatus: { veneno: 0, sangramento: 0, queimadura: 0 },
    duracaoStatus: { veneno: 0, controle: 0 },
    chanceStatus: { congelamento: 0, sono: 0 },
    resistenciaStatusPercentual: 0,
    reducaoDanoDeAfetados: { veneno: 0, negativo: 0 },
  };
}

function escalarResultado(r: ResultadoGatilho, m: number): ResultadoGatilho {
  return {
    ...r,
    ...(r.cura !== undefined ? { cura: r.cura * m } : {}),
    ...(r.curaDoDano ? { curaDoDano: { ...r.curaDoDano, percentual: r.curaDoDano.percentual * m } } : {}),
    ...(r.escudo ? { escudo: { ...r.escudo, percentual: r.escudo.percentual * m } } : {}),
    ...(r.bonus
      ? {
          bonus: {
            ...r.bonus,
            ...(r.bonus.dano !== undefined ? { dano: r.bonus.dano * m } : {}),
            ...(r.bonus.def !== undefined ? { def: r.bonus.def * m } : {}),
            ...(r.bonus.reducao !== undefined ? { reducao: r.bonus.reducao * m } : {}),
          },
        }
      : {}),
    ...(r.debuffDefesaNoInimigo ? { debuffDefesaNoInimigo: { ...r.debuffDefesaNoInimigo, percentual: r.debuffDefesaNoInimigo.percentual * m } } : {}),
    ...(r.danoExtra ? { danoExtra: { ...r.danoExtra, percentual: r.danoExtra.percentual * m } } : {}),
  };
}

/** Soma os efeitos fixos das habilidades dos emblemas equipados (cada um com o valor do nível da habilidade). */
export function efeitosEstaticosDosEmblemas(equipados: readonly EmblemaItem[]): EfeitosEstaticosDosEmblemas {
  const r = efeitosVazios();
  for (const n of nivelDasHabilidades(equipados)) {
    const efeitos = EFEITOS_DOS_EMBLEMAS[n.tipo]?.[n.indice];
    if (!efeitos) continue;
    const m = multiplicadorDoNivel(n.nivel);
    for (const e of efeitos) {
      switch (e.tipo) {
        case 'atq': r.atqPercentual += e.percentual * m; break;
        case 'def': r.defPercentual += e.percentual * m; break;
        case 'hp': r.hpPercentual += e.percentual * m; break;
        case 'iniciativa': r.iniciativaPercentual += e.percentual * m; break;
        case 'critico': r.criticoPontos += e.pontos * m; break;
        case 'danoElemental': r.danoElemental[e.elemento] = (r.danoElemental[e.elemento] ?? 0) + e.percentual * m; break;
        case 'resistenciaElemental':
          for (const el of e.elemento === 'todos' ? ELEMENTOS : [e.elemento]) {
            r.resistenciaElemental[el] = (r.resistenciaElemental[el] ?? 0) + e.percentual * m;
          }
          break;
        case 'reducaoDano': r.reducaoDano[e.alvo] += e.percentual * m; break;
        case 'danoSe': r.danoSe.push({ percentual: e.percentual * m, condicao: e.condicao }); break;
        case 'danoElementalSe': r.danoElementalSe.push({ elemento: e.elemento, percentual: e.percentual * m, condicao: e.condicao }); break;
        case 'danoCritico': r.danoCritico.push({ percentual: e.percentual * m, condicao: e.condicao ?? {} }); break;
        case 'ignorarDefesa': r.ignorarDefesa.push({ percentual: e.percentual * m, condicao: e.condicao }); break;
        case 'danoGolpesSeguidos': r.danoGolpesSeguidosPercentual += e.percentual * m; break;
        case 'ataqueAdicional': r.chanceAtaqueAdicional += e.chance * m; break;
        case 'criticoSe': r.criticoSe.push({ percentual: e.pontos * m, condicao: e.condicao }); break;
        case 'gatilho':
          r.gatilhos.push({
            id: `${n.tipo}:${n.indice}`,
            nome: TIPO_EMBLEMA_MAP[n.tipo]?.habilidades[n.indice]?.nome ?? n.tipo,
            quando: e.quando,
            chance: e.chance,
            usosPorCombate: e.usosPorCombate,
            umaVezPorRodada: e.umaVezPorRodada,
            resultado: escalarResultado(e.resultado, m),
          });
          break;
        case 'danoStatus': r.danoStatus[e.status] += e.percentual * m; break;
        case 'duracaoStatus': r.duracaoStatus[e.alvo] += e.percentual * m; break;
        case 'chanceStatus': r.chanceStatus[e.status] += e.percentual * m; break;
        case 'resistenciaStatus': r.resistenciaStatusPercentual += e.percentual * m; break;
        case 'reducaoDanoDeAfetados': r.reducaoDanoDeAfetados[e.alvo] += e.percentual * m; break;
      }
    }
  }
  return r;
}

/** O que vai para o motor de combate (o que o motor lê dos emblemas). */
export type EmblemasNoCombate = Pick<
  EfeitosEstaticosDosEmblemas,
  | 'defPercentual'
  | 'danoElemental'
  | 'reducaoDano'
  | 'danoSe'
  | 'danoElementalSe'
  | 'danoCritico'
  | 'criticoSe'
  | 'ignorarDefesa'
  | 'danoGolpesSeguidosPercentual'
  | 'chanceAtaqueAdicional'
  | 'gatilhos'
  | 'danoStatus'
  | 'duracaoStatus'
  | 'chanceStatus'
  | 'resistenciaStatusPercentual'
  | 'reducaoDanoDeAfetados'
>;

export function emblemasNoCombate(e: EfeitosEstaticosDosEmblemas): EmblemasNoCombate | undefined {
  const temReducao = Object.values(e.reducaoDano).some((v) => v > 0);
  const temStatus =
    Object.values(e.danoStatus).some((v) => v > 0) ||
    Object.values(e.duracaoStatus).some((v) => v > 0) ||
    Object.values(e.chanceStatus).some((v) => v > 0) ||
    Object.values(e.reducaoDanoDeAfetados).some((v) => v > 0) ||
    e.resistenciaStatusPercentual > 0;
  const temCondicional = e.danoSe.length + e.danoElementalSe.length + e.danoCritico.length + e.criticoSe.length + e.gatilhos.length + e.ignorarDefesa.length > 0 ||
    e.danoGolpesSeguidosPercentual > 0 ||
    e.chanceAtaqueAdicional > 0;
  if (e.defPercentual === 0 && Object.keys(e.danoElemental).length === 0 && !temReducao && !temStatus && !temCondicional) {
    return undefined;
  }
  return {
    defPercentual: e.defPercentual,
    danoElemental: e.danoElemental,
    reducaoDano: e.reducaoDano,
    danoSe: e.danoSe,
    danoElementalSe: e.danoElementalSe,
    danoCritico: e.danoCritico,
    criticoSe: e.criticoSe,
    ignorarDefesa: e.ignorarDefesa,
    danoGolpesSeguidosPercentual: e.danoGolpesSeguidosPercentual,
    chanceAtaqueAdicional: e.chanceAtaqueAdicional,
    gatilhos: e.gatilhos,
    danoStatus: e.danoStatus,
    duracaoStatus: e.duracaoStatus,
    chanceStatus: e.chanceStatus,
    resistenciaStatusPercentual: e.resistenciaStatusPercentual,
    reducaoDanoDeAfetados: e.reducaoDanoDeAfetados,
  };
}
