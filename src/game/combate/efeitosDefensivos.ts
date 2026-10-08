import { GAME_CONFIG } from '@/rules/config';

/**
 * Catálogo 1.2 — Mitigação e defesa (1.2.4).
 * Efeitos que uma habilidade coloca no próprio usuário. A duração conta os turnos do INIMIGO:
 * "1 rodada" protege a próxima vez que o inimigo agir contra quem tem o efeito
 * (com as duas ações, se ele tiver o dobro da Agilidade).
 */
export type TipoEfeitoDefensivo =
  | 'escudoTemporario' // +X% do Sobreescudo máximo enquanto durar; o que sobrar some no fim
  | 'resistenciaFisica' // −X% de dano físico recebido
  | 'resistenciaMagica' // −X% de dano mágico recebido
  | 'redirecionamento' // counter: devolve ao inimigo X% do dano recebido
  | 'imortalidadeBreve' // não recebe dano
  | 'absorcaoMagica' // −X% no próximo ataque mágico recebido, e só nele
  | 'contrapeso'; // até X% de redução (padrão 15%) com HP cheio, caindo em linha reta até 0%

export interface AplicacaoEfeitoDefensivo {
  efeito: TipoEfeitoDefensivo;
  /** Percentual do efeito (ignorado na Imortalidade Breve; no Contrapeso, 0 = padrão de 15%). */
  valorPercentual: number;
  duracaoRodadas: number;
}

export interface EfeitoDefensivoAtivo {
  efeito: TipoEfeitoDefensivo;
  valorPercentual: number;
  rodadasRestantes: number;
  /** Escudo Temporário: quanto do escudo concedido ainda não foi gasto. */
  escudoRestante?: number;
}

export const NOMES_EFEITOS_DEFENSIVOS: Record<TipoEfeitoDefensivo, string> = {
  escudoTemporario: 'Escudo Temporário',
  resistenciaFisica: 'Resistência Física',
  resistenciaMagica: 'Resistência Mágica',
  redirecionamento: 'Redirecionamento',
  imortalidadeBreve: 'Imortalidade Breve',
  absorcaoMagica: 'Absorção Mágica',
  contrapeso: 'Contrapeso',
};

/**
 * Coloca o efeito na lista. Se já houver o mesmo efeito, ele é renovado (vale o novo valor e a nova duração;
 * no Escudo Temporário o escudo novo substitui o que sobrou do anterior).
 * Retorna a nova lista e quanto de Sobreescudo precisa ser somado agora (Escudo Temporário).
 */
export function adicionarEfeitoDefensivo(
  lista: readonly EfeitoDefensivoAtivo[],
  aplicacao: AplicacaoEfeitoDefensivo,
  sobreescudoMaximo: number
): { efeitos: EfeitoDefensivoAtivo[]; sobreescudoGanho: number; sobreescudoRemovido: number } {
  if (aplicacao.duracaoRodadas <= 0) {
    return { efeitos: [...lista], sobreescudoGanho: 0, sobreescudoRemovido: 0 };
  }
  const anterior = lista.find((e) => e.efeito === aplicacao.efeito);
  const restantes = lista.filter((e) => e.efeito !== aplicacao.efeito);
  const novo: EfeitoDefensivoAtivo = {
    efeito: aplicacao.efeito,
    valorPercentual: Math.max(0, aplicacao.valorPercentual),
    rodadasRestantes: aplicacao.duracaoRodadas,
  };

  let sobreescudoGanho = 0;
  let sobreescudoRemovido = 0;
  if (aplicacao.efeito === 'escudoTemporario') {
    sobreescudoGanho = Math.ceil((Math.max(0, sobreescudoMaximo) * novo.valorPercentual) / 100);
    sobreescudoRemovido = anterior?.escudoRestante ?? 0;
    novo.escudoRestante = sobreescudoGanho;
  }

  return { efeitos: [...restantes, novo], sobreescudoGanho, sobreescudoRemovido };
}

function obter(lista: readonly EfeitoDefensivoAtivo[], efeito: TipoEfeitoDefensivo) {
  return lista.find((e) => e.efeito === efeito && e.rodadasRestantes > 0);
}

export function estaImortal(lista: readonly EfeitoDefensivoAtivo[]): boolean {
  return obter(lista, 'imortalidadeBreve') !== undefined;
}

/** Redução do Contrapeso: valor cheio com HP cheio, caindo em linha reta até 0% com HP zerado. */
export function reducaoContrapesoPercentual(valorMaximo: number, hp: number, hpMax: number): number {
  if (hpMax <= 0) return 0;
  const maximo = valorMaximo > 0 ? valorMaximo : GAME_CONFIG.CONTRAPESO_REDUCAO_MAXIMA_PERCENTUAL;
  const fracao = Math.min(1, Math.max(0, hp / hpMax));
  return Number((maximo * fracao).toFixed(4));
}

/**
 * Soma (regra 1.2.2) das reduções de dano recebido vindas dos efeitos ativos.
 * O teto de 80% é aplicado por quem soma todas as reduções do golpe.
 */
export function reducaoDanoRecebidoPorEfeitos(
  lista: readonly EfeitoDefensivoAtivo[],
  golpe: { ehDanoFisico: boolean; hp: number; hpMax: number }
): number {
  let total = 0;
  const resistencia = obter(lista, golpe.ehDanoFisico ? 'resistenciaFisica' : 'resistenciaMagica');
  if (resistencia) total += resistencia.valorPercentual;
  const contrapeso = obter(lista, 'contrapeso');
  if (contrapeso) {
    total += reducaoContrapesoPercentual(contrapeso.valorPercentual, golpe.hp, golpe.hpMax);
  }
  if (!golpe.ehDanoFisico) {
    const absorcao = obter(lista, 'absorcaoMagica');
    if (absorcao) total += absorcao.valorPercentual;
  }
  return total;
}

/** Absorção Mágica vale para um ataque mágico só: depois dele, sai da lista. */
export function consumirAbsorcaoMagica(lista: readonly EfeitoDefensivoAtivo[]): EfeitoDefensivoAtivo[] {
  return lista.filter((e) => e.efeito !== 'absorcaoMagica');
}

export function percentualRedirecionamento(lista: readonly EfeitoDefensivoAtivo[]): number {
  return obter(lista, 'redirecionamento')?.valorPercentual ?? 0;
}

/** Dano devolvido pelo Redirecionamento (arredondado para baixo; 0 se não houver efeito ou dano). */
export function calcularDanoRedirecionado(danoRecebido: number, percentual: number): number {
  if (danoRecebido <= 0 || percentual <= 0) return 0;
  return Math.floor((danoRecebido * percentual) / 100);
}

/** O Sobreescudo gasto num golpe sai primeiro do Escudo Temporário. */
export function gastarEscudoTemporario(
  lista: readonly EfeitoDefensivoAtivo[],
  sobreescudoGasto: number
): EfeitoDefensivoAtivo[] {
  if (sobreescudoGasto <= 0) return [...lista];
  return lista.map((e) =>
    e.efeito === 'escudoTemporario' && e.escudoRestante !== undefined
      ? { ...e, escudoRestante: Math.max(0, e.escudoRestante - sobreescudoGasto) }
      : e
  );
}

/**
 * Fim de um turno do inimigo contra quem tem os efeitos: cada efeito perde 1 rodada.
 * Os que acabam saem; o Escudo Temporário que sobrou é retirado do Sobreescudo.
 */
export function avancarRodadaEfeitosDefensivos(lista: readonly EfeitoDefensivoAtivo[]): {
  efeitos: EfeitoDefensivoAtivo[];
  sobreescudoRemovido: number;
  expirados: TipoEfeitoDefensivo[];
} {
  const efeitos: EfeitoDefensivoAtivo[] = [];
  const expirados: TipoEfeitoDefensivo[] = [];
  let sobreescudoRemovido = 0;
  for (const e of lista) {
    const rodadasRestantes = e.rodadasRestantes - 1;
    if (rodadasRestantes > 0) {
      efeitos.push({ ...e, rodadasRestantes });
    } else {
      expirados.push(e.efeito);
      if (e.efeito === 'escudoTemporario') sobreescudoRemovido += e.escudoRestante ?? 0;
    }
  }
  return { efeitos, sobreescudoRemovido, expirados };
}
