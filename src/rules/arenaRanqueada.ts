import type { PresenteDoCorreio } from './correio';

/**
 * Arena ranqueada (7.5, decidida pelo Yuri em 24 a 26/10/2026). 10 ranques por pontos; os adversários são de um ranque
 * acima ou abaixo (sem ninguém ali, os do ranque mais próximo). 5 lutas por dia, sem compra. Só quem ataca ganha ou
 * perde pontos. Toda segunda, à meia-noite de Brasília, todo mundo perde 40% dos pontos, e o ranque em que terminou a
 * semana dá a recompensa (pelo Correio, com pelo menos 1 luta na semana): ouro, Diamantes, selos de busca (até o
 * Lendário), o título do ranque (fica na coleção) e, no Eterno, um baú de escolha de carta lendária. A moldura de cada
 * ranque entra quando houver a arte. Os valores são proposta do Claude, aprovada pelo Yuri em 26/10/2026.
 */

export const LUTAS_RANQUEADAS_POR_DIA = 5;
export const PONTOS_POR_VITORIA = 25;
export const PONTOS_POR_DERROTA = -15;
export const QUEDA_SEMANAL_PERCENTUAL = 40;

export interface RanqueDaArena {
  id: string;
  nome: string;
  /** Pontos para entrar no ranque. */
  minimo: number;
  ouro: number;
  diamantes: number;
  selos: { desgastado?: number; encantado?: number; eternidade?: number };
  /** O título do ranque (TITULOS). */
  titulo: string;
  /** Baú de escolha de carta lendária (só o Eterno). */
  bauDeCartaLendaria?: true;
}

export const RANQUES: readonly RanqueDaArena[] = [
  { id: 'recruta', nome: 'Recruta', minimo: 0, ouro: 200, diamantes: 0, selos: { desgastado: 5 }, titulo: 'recruta-da-arena' },
  { id: 'combatente', nome: 'Combatente', minimo: 100, ouro: 400, diamantes: 2, selos: { desgastado: 10 }, titulo: 'combatente-da-arena' },
  { id: 'veterano', nome: 'Veterano', minimo: 250, ouro: 600, diamantes: 4, selos: { desgastado: 20 }, titulo: 'veterano-da-arena' },
  { id: 'gladiador', nome: 'Gladiador', minimo: 450, ouro: 900, diamantes: 6, selos: { desgastado: 30, encantado: 5 }, titulo: 'gladiador-da-arena' },
  { id: 'elite', nome: 'Elite', minimo: 700, ouro: 1_200, diamantes: 8, selos: { encantado: 10 }, titulo: 'elite-da-arena' },
  { id: 'campeao', nome: 'Campeão', minimo: 1_000, ouro: 1_600, diamantes: 12, selos: { encantado: 15 }, titulo: 'campeao-da-arena' },
  { id: 'ascendente', nome: 'Ascendente', minimo: 1_350, ouro: 2_000, diamantes: 16, selos: { encantado: 20, eternidade: 1 }, titulo: 'ascendente-da-arena' },
  { id: 'soberano', nome: 'Soberano', minimo: 1_750, ouro: 2_500, diamantes: 20, selos: { encantado: 30, eternidade: 2 }, titulo: 'soberano-da-arena' },
  { id: 'transcendente', nome: 'Transcendente', minimo: 2_200, ouro: 3_000, diamantes: 25, selos: { eternidade: 3 }, titulo: 'transcendente-da-arena' },
  { id: 'eterno', nome: 'Eterno', minimo: 2_700, ouro: 4_000, diamantes: 30, selos: { eternidade: 5 }, titulo: 'eterno-da-arena', bauDeCartaLendaria: true },
];

/** O índice do ranque (0 = Recruta, 9 = Eterno) para os pontos. */
export function indiceDoRanque(pontos: number): number {
  let i = 0;
  while (i + 1 < RANQUES.length && pontos >= RANQUES[i + 1].minimo) i++;
  return i;
}
export const ranqueDe = (pontos: number) => RANQUES[indiceDoRanque(pontos)];

/** Os pontos de quem ataca depois da luta (a defesa não muda os pontos; nunca abaixo de 0). */
export const pontosRanqueadosDepois = (pontos: number, venceu: boolean) => Math.max(0, pontos + (venceu ? PONTOS_POR_VITORIA : PONTOS_POR_DERROTA));

/** Os pontos que passam para a semana seguinte: cada segunda tira 40% (n semanas, n quedas). */
export function pontosDepoisDasQuedas(pontos: number, semanas: number): number {
  let p = pontos;
  for (let i = 0; i < Math.max(0, semanas); i++) p = Math.floor((p * (100 - QUEDA_SEMANAL_PERCENTUAL)) / 100);
  return p;
}

export const presenteDoRanque = (r: RanqueDaArena): PresenteDoCorreio => ({
  ouro: r.ouro,
  ...(r.diamantes ? { diamantes: r.diamantes } : {}),
  selos: { ...r.selos },
  titulos: [r.titulo],
});

/** Um baú de escolha guardado no personagem até o jogador escolher (hoje: o de carta lendária do Eterno). */
export interface BauDeEscolha {
  id: string;
  tipo: 'cartaLendaria';
  origem: string;
  em: string;
}

export function bausDeEscolhaDoDocumento(bruto: unknown): BauDeEscolha[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = bruto
    .filter((b): b is BauDeEscolha => !!b && typeof (b as BauDeEscolha).id === 'string' && (b as BauDeEscolha).tipo === 'cartaLendaria')
    .map((b) => ({ id: b.id, tipo: b.tipo, origem: String(b.origem ?? ''), em: String(b.em ?? '') }))
    .slice(0, 20);
  return lista.length ? lista : undefined;
}
