import { EfeitoStatus } from '@/rules/statusEffects';

/**
 * Catálogo 1.2 — Debuffs e controle (1.2.4).
 * Efeitos que uma habilidade coloca no INIMIGO que acabou de atacar. A duração conta as AÇÕES de quem
 * sofre o debuff (uma "rodada" dele): o debuff vale já na próxima ação dele.
 */
export type AplicacaoDebuff =
  /** Enfraquecimento: −X% do dano que o alvo causa. */
  | { tipo: 'enfraquecimento'; percentual: number; rodadas: number }
  /** Cicatrização: as curas do alvo ficam X% menos eficazes. */
  | { tipo: 'cicatrizacao'; percentual: number; rodadas: number }
  /** Ponto Fraco: o próximo dano que o alvo receber será X% maior; consumido nesse golpe. */
  | { tipo: 'pontoFraco'; percentual: number }
  /** Pressão: o alvo perde X% da defesa enquanto o HP dele estiver abaixo de Y% do máximo. */
  | { tipo: 'pressao'; percentualDefesa: number; limiteHpPercentual: number; rodadas: number }
  /** Exaustão: a Agilidade do alvo cai X% (o catálogo fixa 30%). */
  | { tipo: 'exaustao'; percentual: number; rodadas: number }
  /** Redução de defesa: o alvo perde X% da defesa por N rodadas (Sopro Dracônico de terra). */
  | { tipo: 'reducaoDefesa'; percentual: number; rodadas: number }
  /** Distração: o alvo perde as próximas N ações (o catálogo fixa 1). */
  | { tipo: 'distracao'; acoes: number }
  /** Bloco C — Sono: o alvo perde as próximas N ações. */
  | { tipo: 'sono'; acoes: number }
  /** Bloco C — Loucura: o alvo perde as próximas N ações (além do dano imediato). */
  | { tipo: 'loucura'; acoes: number }
  /** Bloco C — Paralisia: o alvo não age até ser atingido uma vez. */
  | { tipo: 'paralisia' }
  /** Bloco C — Lentidão: a Agilidade do alvo cai X% (Congelamento; Paralisia ao acordar). */
  | { tipo: 'lentidao'; percentual: number; rodadas: number; origem?: OrigemLentidao };

export type OrigemLentidao = 'congelamento' | 'paralisia';
/** Debuffs que fazem o alvo perder a ação. */
export type TipoIncapacitacao = 'paralisia' | 'sono' | 'loucura' | 'distracao';

export type TipoDebuff = AplicacaoDebuff['tipo'];

export interface DebuffAtivo {
  tipo: TipoDebuff;
  percentual?: number;
  limiteHpPercentual?: number;
  origem?: OrigemLentidao;
  /** Rodadas (ações do alvo) que faltam; no Ponto Fraco e na Distração não é usado como duração. */
  rodadasRestantes: number;
}

export const PERCENTUAL_EXAUSTAO_PADRAO = 30;

/** Aplica os debuffs. O mesmo debuff renova (vale o novo valor e a nova duração). Retorna também os status forçados. */
export function adicionarDebuffs(
  lista: readonly DebuffAtivo[] | undefined,
  aplicacoes: readonly AplicacaoDebuff[]
): DebuffAtivo[] {
  let resultado = [...(lista ?? [])];
  for (const a of aplicacoes) {
    resultado = resultado.filter((d) => d.tipo !== a.tipo);
    switch (a.tipo) {
      case 'enfraquecimento':
      case 'cicatrizacao':
      case 'reducaoDefesa':
      case 'exaustao':
        if (a.rodadas > 0) {
          resultado.push({ tipo: a.tipo, percentual: a.percentual, rodadasRestantes: a.rodadas });
        }
        break;
      case 'pressao':
        if (a.rodadas > 0) {
          resultado.push({
            tipo: 'pressao',
            percentual: a.percentualDefesa,
            limiteHpPercentual: a.limiteHpPercentual,
            rodadasRestantes: a.rodadas,
          });
        }
        break;
      case 'pontoFraco':
        resultado.push({ tipo: 'pontoFraco', percentual: a.percentual, rodadasRestantes: 1 });
        break;
      case 'distracao':
        if (a.acoes > 0) {
          resultado.push({ tipo: 'distracao', rodadasRestantes: a.acoes });
        }
        break;
      case 'sono':
      case 'loucura':
        if (a.acoes > 0) {
          resultado.push({ tipo: a.tipo, rodadasRestantes: a.acoes });
        }
        break;
      case 'paralisia':
        resultado.push({ tipo: 'paralisia', rodadasRestantes: 1 });
        break;
      case 'lentidao':
        if (a.rodadas > 0) {
          resultado.push({
            tipo: 'lentidao',
            percentual: a.percentual,
            origem: a.origem,
            rodadasRestantes: a.rodadas,
          });
        }
        break;
    }
  }
  return resultado;
}

function obter(lista: readonly DebuffAtivo[] | undefined, tipo: TipoDebuff) {
  return (lista ?? []).find((d) => d.tipo === tipo && d.rodadasRestantes > 0);
}

/** Enfraquecimento, como bônus de dano negativo (entra na soma da regra 1.2.2). */
export function bonusDanoDosDebuffs(lista: readonly DebuffAtivo[] | undefined): number {
  return 0 - (obter(lista, 'enfraquecimento')?.percentual ?? 0);
}

/** Redução de defesa em % que o alvo sofre por esse debuff. */
export function reducaoDefesaDosDebuffs(lista: readonly DebuffAtivo[] | undefined): number {
  return obter(lista, 'reducaoDefesa')?.percentual ?? 0;
}

/** Fator das curas de quem tem Cicatrização: 100 = cura normal. */
export function fatorCuraPercentual(lista: readonly DebuffAtivo[] | undefined): number {
  return Math.max(0, 100 - (obter(lista, 'cicatrizacao')?.percentual ?? 0));
}

/** Ponto Fraco que o alvo carrega (% a mais no próximo dano que receber). */
export function percentualPontoFraco(lista: readonly DebuffAtivo[] | undefined): number {
  return obter(lista, 'pontoFraco')?.percentual ?? 0;
}

export function consumirPontoFraco(lista: readonly DebuffAtivo[] | undefined): DebuffAtivo[] {
  return (lista ?? []).filter((d) => d.tipo !== 'pontoFraco');
}

/** Pressão: % de defesa que o alvo perde agora (só com o HP abaixo do limite). */
export function reducaoDefesaPorPressao(
  lista: readonly DebuffAtivo[] | undefined,
  hp: number,
  hpMax: number
): number {
  const p = obter(lista, 'pressao');
  if (!p || hpMax <= 0) return 0;
  return (hp * 100) / hpMax < (p.limiteHpPercentual ?? 0) ? (p.percentual ?? 0) : 0;
}

/** Exaustão: Agilidade com a queda aplicada (arredondada para baixo). */
export function agilidadeComExaustao(
  agilidade: number,
  lista: readonly DebuffAtivo[] | undefined
): number {
  const e = obter(lista, 'exaustao');
  const l = obter(lista, 'lentidao');
  if (!e && !l) return agilidade;
  const fatorExaustao = e ? Math.max(0, 100 - (e.percentual ?? PERCENTUAL_EXAUSTAO_PADRAO)) : 100;
  const fatorLentidao = l ? Math.max(0, 100 - (l.percentual ?? 0)) : 100;
  return Math.floor((agilidade * fatorExaustao * fatorLentidao) / 10_000);
}

export function estaDistraido(lista: readonly DebuffAtivo[] | undefined): boolean {
  return obter(lista, 'distracao') !== undefined;
}

/** O alvo perdeu a ação: gasta 1 Distração. */
export function consumirDistracao(lista: readonly DebuffAtivo[] | undefined): DebuffAtivo[] {
  const resultado: DebuffAtivo[] = [];
  let gasta = false;
  for (const d of lista ?? []) {
    if (d.tipo === 'distracao' && !gasta) {
      gasta = true;
      if (d.rodadasRestantes - 1 > 0) resultado.push({ ...d, rodadasRestantes: d.rodadasRestantes - 1 });
    } else {
      resultado.push(d);
    }
  }
  return resultado;
}

const ORDEM_INCAPACITACAO: readonly TipoIncapacitacao[] = ['paralisia', 'sono', 'loucura', 'distracao'];

/** Qual debuff está impedindo o alvo de agir (paralisia, sono, loucura ou distração), se algum. */
export function incapacitacaoAtiva(
  lista: readonly DebuffAtivo[] | undefined
): TipoIncapacitacao | undefined {
  return ORDEM_INCAPACITACAO.find((tipo) => obter(lista, tipo) !== undefined);
}

/** O alvo perdeu a ação: gasta 1 ação do Sono, da Loucura ou da Distração. A Paralisia só acaba quando o alvo é atingido. */
export function consumirIncapacitacao(
  lista: readonly DebuffAtivo[] | undefined,
  tipo: TipoIncapacitacao
): DebuffAtivo[] {
  if (tipo === 'paralisia') return [...(lista ?? [])];
  const resultado: DebuffAtivo[] = [];
  let gasta = false;
  for (const d of lista ?? []) {
    if (d.tipo === tipo && !gasta) {
      gasta = true;
      if (d.rodadasRestantes - 1 > 0) resultado.push({ ...d, rodadasRestantes: d.rodadasRestantes - 1 });
    } else {
      resultado.push(d);
    }
  }
  return resultado;
}

/** Paralisia: o alvo foi atingido, então acorda e fica mais lento (queda de Agilidade por algumas rodadas). */
export function acordarDaParalisia(
  lista: readonly DebuffAtivo[] | undefined,
  lentidao: { percentual: number; rodadas: number }
): { debuffs: DebuffAtivo[]; acordou: boolean } {
  const paralisado = obter(lista, 'paralisia') !== undefined;
  if (!paralisado) return { debuffs: [...(lista ?? [])], acordou: false };
  const semParalisia = (lista ?? []).filter((d) => d.tipo !== 'paralisia');
  return {
    debuffs: adicionarDebuffs(semParalisia, [
      { tipo: 'lentidao', percentual: lentidao.percentual, rodadas: lentidao.rodadas, origem: 'paralisia' },
    ]),
    acordou: true,
  };
}

/** Congelamento: um golpe de fogo encerra a lentidão do congelamento antes do fim. */
export function removerLentidaoDeOrigem(
  lista: readonly DebuffAtivo[] | undefined,
  origem: OrigemLentidao
): { debuffs: DebuffAtivo[]; removeu: boolean } {
  const debuffs = (lista ?? []).filter((d) => !(d.tipo === 'lentidao' && d.origem === origem));
  return { debuffs, removeu: debuffs.length !== (lista ?? []).length };
}

/** Fim de uma ação de quem sofre os debuffs: os de duração perdem 1 rodada (Ponto Fraco, Distração, Sono, Loucura e Paralisia não: acabam por ação perdida ou golpe). */
export function avancarDebuffs(lista: readonly DebuffAtivo[] | undefined): {
  debuffs: DebuffAtivo[];
  expirados: TipoDebuff[];
} {
  const debuffs: DebuffAtivo[] = [];
  const expirados: TipoDebuff[] = [];
  for (const d of lista ?? []) {
    if (
      d.tipo === 'pontoFraco' ||
      d.tipo === 'distracao' ||
      d.tipo === 'sono' ||
      d.tipo === 'loucura' ||
      d.tipo === 'paralisia'
    ) {
      debuffs.push(d);
      continue;
    }
    const restantes = d.rodadasRestantes - 1;
    if (restantes > 0) debuffs.push({ ...d, rodadasRestantes: restantes });
    else expirados.push(d.tipo);
  }
  return { debuffs, expirados };
}

export type StatusForcado = EfeitoStatus;
