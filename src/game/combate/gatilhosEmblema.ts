import type { Elemento } from '@/rules/elements';
import type { BonusTemporario } from '@/rules/emblemasEfeitos';
import type { EmblemasNoCombate, GatilhoNoCombate } from '../emblemasEfeitos';

/** Um bônus temporário ativo. O valor é por pilha; o total é o valor vezes as pilhas. */
export interface BonusAtivoEmblema {
  id: string;
  dano: number;
  def: number;
  reducao: number;
  /** Vale da rodada `deRodada` até `ateRodada`, ou (com `golpes`) até os golpes acabarem. */
  deRodada: number;
  ateRodada: number;
  golpes?: number;
  pilhas: number;
  pilhasMax: number;
}

/** O que os gatilhos dos emblemas guardam durante a luta (nunca é persistido). */
export interface EstadoGatilhosEmblema {
  usos: Record<string, number>;
  ultimaRodada: Record<string, number>;
  bonus: BonusAtivoEmblema[];
  /** Cura já feita na rodada pelas habilidades que curam um % do dano (para respeitar o teto por rodada). */
  curaDoDano: Record<string, { rodada: number; total: number }>;
}

export function novoEstadoGatilhos(): EstadoGatilhosEmblema {
  return { usos: {}, ultimaRodada: {}, bonus: [], curaDoDano: {} };
}

/** O que acabou de acontecer na luta. */
export type AcontecimentoDaLuta =
  | { evento: 'criticoDado'; danoDoGolpe: number }
  | { evento: 'danoRecebido'; percentualHpPerdido: number }
  | { evento: 'inimigoMorto' }
  | { evento: 'hpAbaixo'; hpPercentual: number }
  | { evento: 'golpeElemental'; elemento: Elemento; danoCausado: number; hpAtualDoAlvo: number; hpMaxDoAlvo: number }
  | { evento: 'efeitoResistido' }
  | { evento: 'controleAplicado' }
  | { evento: 'atacadoPorInimigo' };

export interface ContextoDoDisparo {
  rodada: number;
  hpMaxProprio: number;
  /** Sorteio em [0, 100) para as habilidades com chance. */
  sorteio: () => number;
}

/** O que um gatilho que disparou manda o motor fazer (os bônus temporários já entram no estado). */
export interface DisparoDeEmblema {
  nome: string;
  cura: number;
  escudoPercentual?: number;
  escudoRodadas?: number;
  removerNegativos: boolean;
  sangramentoNoInimigo: boolean;
  danoExtra: number;
  debuffDefesaNoInimigo?: { percentual: number; rodadas: number };
}

function corresponde(g: GatilhoNoCombate, a: AcontecimentoDaLuta): boolean {
  const q = g.quando;
  if (q.evento !== a.evento) return false;
  switch (a.evento) {
    case 'danoRecebido':
      return q.evento === 'danoRecebido' && a.percentualHpPerdido > 0 && a.percentualHpPerdido >= q.minimoPercentualHp;
    case 'hpAbaixo':
      return q.evento === 'hpAbaixo' && a.hpPercentual < q.percentual;
    case 'golpeElemental':
      return (
        q.evento === 'golpeElemental' &&
        q.elemento === a.elemento &&
        (q.alvoHpAbaixo === undefined || (a.hpMaxDoAlvo > 0 && (a.hpAtualDoAlvo * 100) / a.hpMaxDoAlvo < q.alvoHpAbaixo))
      );
    default:
      return true;
  }
}

function registrarBonus(estado: EstadoGatilhosEmblema, id: string, b: BonusTemporario, rodada: number): void {
  const pilhasMax = Math.max(1, b.pilhasMax ?? 1);
  const novo: Omit<BonusAtivoEmblema, 'pilhas'> = {
    id,
    dano: b.dano ?? 0,
    def: b.def ?? 0,
    reducao: b.reducao ?? 0,
    deRodada: rodada + 1,
    ateRodada: b.golpes !== undefined ? Number.POSITIVE_INFINITY : rodada + (b.rodadas ?? 2),
    ...(b.golpes !== undefined ? { golpes: b.golpes } : {}),
    pilhasMax,
  };
  const existente = estado.bonus.find((x) => x.id === id && x.ateRodada >= rodada && (x.golpes === undefined || x.golpes > 0));
  if (existente) {
    Object.assign(existente, novo, { pilhas: Math.min(pilhasMax, existente.pilhas + 1) });
  } else {
    estado.bonus.push({ ...novo, pilhas: 1 });
  }
}

/**
 * Avalia os gatilhos dos emblemas para um acontecimento: confere usos, rodada e chance, registra os bônus
 * temporários no estado e devolve o que o motor precisa aplicar (cura, escudo, dano extra, remover negativos).
 */
export function dispararGatilhos(
  emblemas: EmblemasNoCombate | undefined,
  estado: EstadoGatilhosEmblema,
  acontecimento: AcontecimentoDaLuta,
  ctx: ContextoDoDisparo
): DisparoDeEmblema[] {
  const disparos: DisparoDeEmblema[] = [];
  for (const g of emblemas?.gatilhos ?? []) {
    if (!corresponde(g, acontecimento)) continue;
    if (g.usosPorCombate !== undefined && (estado.usos[g.id] ?? 0) >= g.usosPorCombate) continue;
    if (g.umaVezPorRodada && estado.ultimaRodada[g.id] === ctx.rodada) continue;
    if (g.chance !== undefined && !(ctx.sorteio() < g.chance)) continue;

    const r = g.resultado;
    const disparo: DisparoDeEmblema = {
      nome: g.nome,
      cura: r.cura !== undefined ? Math.floor((ctx.hpMaxProprio * r.cura) / 100) : 0,
      removerNegativos: r.removerNegativos === true,
      sangramentoNoInimigo: r.sangramentoNoInimigo === true,
      danoExtra: 0,
    };
    if (r.debuffDefesaNoInimigo) disparo.debuffDefesaNoInimigo = r.debuffDefesaNoInimigo;
    if (r.escudo) {
      disparo.escudoPercentual = r.escudo.percentual;
      disparo.escudoRodadas = r.escudo.rodadas;
    }
    if (r.curaDoDano && acontecimento.evento === 'golpeElemental') {
      const limite = Math.floor((ctx.hpMaxProprio * r.curaDoDano.limiteHpMax) / 100);
      const feito = estado.curaDoDano[g.id]?.rodada === ctx.rodada ? estado.curaDoDano[g.id].total : 0;
      const cura = Math.max(0, Math.min(Math.floor((acontecimento.danoCausado * r.curaDoDano.percentual) / 100), limite - feito));
      estado.curaDoDano[g.id] = { rodada: ctx.rodada, total: feito + cura };
      disparo.cura += cura;
    }
    if (r.danoExtra) {
      if (r.danoExtra.base === 'golpe' && acontecimento.evento === 'criticoDado') {
        disparo.danoExtra = Math.floor((acontecimento.danoDoGolpe * r.danoExtra.percentual) / 100);
      } else if (r.danoExtra.base === 'hpAtualDoAlvo' && acontecimento.evento === 'golpeElemental') {
        disparo.danoExtra = Math.min(
          Math.floor((acontecimento.hpAtualDoAlvo * r.danoExtra.percentual) / 100),
          Math.floor((ctx.hpMaxProprio * r.danoExtra.limiteHpMaxProprio) / 100)
        );
      }
    }
    // Habilidade que só cura e não tinha o que curar (teto da rodada já gasto) não dispara
    if (r.curaDoDano && !r.bonus && !r.escudo && disparo.cura === 0) continue;
    if (r.bonus) registrarBonus(estado, g.id, r.bonus, ctx.rodada);

    estado.usos[g.id] = (estado.usos[g.id] ?? 0) + 1;
    estado.ultimaRodada[g.id] = ctx.rodada;
    disparos.push(disparo);
  }
  return disparos;
}

function ativo(b: BonusAtivoEmblema, rodada: number): boolean {
  if (b.golpes !== undefined) return b.golpes > 0 && rodada >= b.deRodada;
  return rodada >= b.deRodada && rodada <= b.ateRodada;
}

/** Soma dos bônus temporários dos emblemas que valem nesta rodada. */
export function bonusDosGatilhos(estado: EstadoGatilhosEmblema | undefined, rodada: number): { dano: number; def: number; reducao: number } {
  const r = { dano: 0, def: 0, reducao: 0 };
  for (const b of estado?.bonus ?? []) {
    if (!ativo(b, rodada)) continue;
    r.dano += b.dano * b.pilhas;
    r.def += b.def * b.pilhas;
    r.reducao += b.reducao * b.pilhas;
  }
  return r;
}

/** O personagem deu um golpe: gasta um golpe dos bônus que duram golpes (e os que acabaram saem da lista). */
export function consumirGolpeDosGatilhos(estado: EstadoGatilhosEmblema | undefined, rodada: number): void {
  if (!estado) return;
  for (const b of estado.bonus) {
    if (b.golpes !== undefined && ativo(b, rodada)) b.golpes -= 1;
  }
  estado.bonus = estado.bonus.filter((b) => b.golpes === undefined || b.golpes > 0);
}
