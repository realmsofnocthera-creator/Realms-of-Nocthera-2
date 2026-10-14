import { ELEMENTOS, Elemento } from '@/rules/elements';
import { CondicaoDoEfeito, EFEITOS_DOS_EMBLEMAS } from '@/rules/emblemasEfeitos';
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
  danoStatus: { veneno: number; sangramento: number; queimadura: number };
  duracaoStatus: { veneno: number; controle: number };
  chanceStatus: { congelamento: number; sono: number };
  resistenciaStatusPercentual: number;
  reducaoDanoDeAfetados: { veneno: number; negativo: number };
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
    danoStatus: { veneno: 0, sangramento: 0, queimadura: 0 },
    duracaoStatus: { veneno: 0, controle: 0 },
    chanceStatus: { congelamento: 0, sono: 0 },
    resistenciaStatusPercentual: 0,
    reducaoDanoDeAfetados: { veneno: 0, negativo: 0 },
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
  const temCondicional = e.danoSe.length + e.danoElementalSe.length + e.danoCritico.length > 0;
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
    danoStatus: e.danoStatus,
    duracaoStatus: e.duracaoStatus,
    chanceStatus: e.chanceStatus,
    resistenciaStatusPercentual: e.resistenciaStatusPercentual,
    reducaoDanoDeAfetados: e.reducaoDanoDeAfetados,
  };
}
