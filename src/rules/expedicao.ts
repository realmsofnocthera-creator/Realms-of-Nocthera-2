import type { SeloDeBusca } from './colecionaveis';
import type { RaridadeMaterial } from './raridades';

/**
 * Expedição (decidida pelo Yuri em 22/10/2026, no lugar da Provação de Dungeons): o jogador paga ouro e manda uma
 * expedição de 2, 6, 8 ou 12 horas, em até 3 vagas ao mesmo tempo. Ela nunca falha: ao fim do tempo, a recompensa (fixa
 * por turno) fica pronta para coletar. O item Avanço de expedição tira 1 hora de uma expedição já enviada; vem de
 * eventos e, no futuro, de lojas VIP. Abre no nível 15. Os custos e as recompensas foram aprovados pelo Yuri em
 * 22/10/2026 (o ouro 30% menor que a proposta).
 */

export const NIVEL_DA_EXPEDICAO = 15;
export const VAGAS_DE_EXPEDICAO = 3;
/** Com a maestria de Expedição (marcos 50 e 100), até 5 vagas. */
export const VAGAS_MAXIMAS_DE_EXPEDICAO = 5;
export const HORA_MS = 60 * 60_000;
/** Quanto um Avanço de expedição tira do tempo. */
export const AVANCO_MS = HORA_MS;

export interface TurnoDeExpedicao {
  horas: number;
  custoOuro: number;
  selos: Partial<Record<SeloDeBusca, number>>;
  fragmentosDeMemoria: number;
  pedrasDaRecordacao: number;
  /** Quantos materiais de mundo de cada raridade (o tipo é sorteado dentro da raridade). */
  materiais: Partial<Record<RaridadeMaterial, number>>;
}

export const TURNOS_DE_EXPEDICAO: readonly TurnoDeExpedicao[] = [
  { horas: 2, custoOuro: 210, selos: { desgastado: 10 }, fragmentosDeMemoria: 20, pedrasDaRecordacao: 0, materiais: { comum: 2 } },
  { horas: 6, custoOuro: 700, selos: { desgastado: 30, encantado: 5 }, fragmentosDeMemoria: 60, pedrasDaRecordacao: 1, materiais: { comum: 4, raro: 2 } },
  { horas: 8, custoOuro: 1050, selos: { desgastado: 40, encantado: 10, eternidade: 2 }, fragmentosDeMemoria: 90, pedrasDaRecordacao: 2, materiais: { comum: 4, raro: 3, muitoRaro: 1 } },
  {
    horas: 12,
    custoOuro: 1750,
    selos: { desgastado: 60, encantado: 15, eternidade: 5, origem: 1 },
    fragmentosDeMemoria: 150,
    pedrasDaRecordacao: 3,
    materiais: { comum: 5, raro: 4, muitoRaro: 2, epico: 1 },
  },
];

export const turnoDeHoras = (horas: unknown) => TURNOS_DE_EXPEDICAO.find((t) => t.horas === horas);

/** Uma expedição em andamento (ou pronta para coletar) numa vaga. */
export interface ExpedicaoEmAndamento {
  /** A vaga (0, 1 ou 2). */
  vaga: number;
  horas: number;
  /** Quando saiu (ISO). */
  inicio: string;
  /** Quando termina (ISO), já com os Avanços usados. */
  fim: string;
  /** Quantos Avanços já foram usados nela. */
  avancos?: number;
}

export const expedicaoPronta = (e: ExpedicaoEmAndamento, agora: Date) => Date.parse(e.fim) <= agora.getTime();

/** Lê as expedições gravadas, descartando o que é inválido (vaga repetida, turno que não existe, datas quebradas). */
export function expedicoesDoDocumento(bruto: unknown): ExpedicaoEmAndamento[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const vistas = new Set<number>();
  const lista: ExpedicaoEmAndamento[] = [];
  for (const item of bruto) {
    const o = item as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') continue;
    const { vaga, horas, inicio, fim, avancos } = o;
    if (typeof vaga !== 'number' || !Number.isInteger(vaga) || vaga < 0 || vaga >= VAGAS_MAXIMAS_DE_EXPEDICAO || vistas.has(vaga)) continue;
    if (!turnoDeHoras(horas) || typeof inicio !== 'string' || typeof fim !== 'string' || Number.isNaN(Date.parse(inicio)) || Number.isNaN(Date.parse(fim))) continue;
    vistas.add(vaga);
    lista.push({ vaga, horas: horas as number, inicio, fim, ...(typeof avancos === 'number' && Number.isInteger(avancos) && avancos > 0 ? { avancos } : {}) });
  }
  return lista.length ? lista.sort((a, b) => a.vaga - b.vaga) : undefined;
}
