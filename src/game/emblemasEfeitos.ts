import { ELEMENTOS, Elemento } from '@/rules/elements';
import { EFEITOS_DOS_EMBLEMAS } from '@/rules/emblemasEfeitos';
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
      }
    }
  }
  return r;
}

/** O que vai para o motor de combate (o que o motor lê dos emblemas). */
export interface EmblemasNoCombate {
  defPercentual: number;
  danoElemental: Partial<Record<Elemento, number>>;
  reducaoDano: { fisico: number; magico: number; todos: number; chefes: number };
}

export function emblemasNoCombate(e: EfeitosEstaticosDosEmblemas): EmblemasNoCombate | undefined {
  const temReducao = Object.values(e.reducaoDano).some((v) => v > 0);
  if (e.defPercentual === 0 && Object.keys(e.danoElemental).length === 0 && !temReducao) return undefined;
  return { defPercentual: e.defPercentual, danoElemental: e.danoElemental, reducaoDano: e.reducaoDano };
}
