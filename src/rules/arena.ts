import type { PresenteDoCorreio } from './correio';

/**
 * Arena (7.5, decidida pelo Yuri em 24 e 25/10/2026). PvP assíncrono: o jogador escolhe um adversário de uma lista e
 * luta contra a ficha atual dele (os dois lados usam tudo; a luta pode ser vista de novo). Nível 4. 5 lutas por dia e
 * até 5 a mais por 5 Diamantes cada (zeram à meia-noite de Brasília). Ganha e perde pontos atacando e defendendo; a
 * semana começa em 1.000 pontos e, na segunda à meia-noite, sai o pódio (prêmios pelo Correio) e os pontos voltam a
 * 1.000. Os pontos e os prêmios são proposta do Claude, aprovada pelo Yuri em 25/10/2026.
 */

export const NIVEL_DA_ARENA = 4;
export const LUTAS_GRATIS_POR_DIA = 5;
export const COMPRAS_DE_LUTA_POR_DIA = 5;
export const PRECO_DA_LUTA_EM_DIAMANTES = 5;
export const PONTOS_INICIAIS = 1_000;
export const ADVERSARIOS_NA_LISTA = 5;
/** A lista pode ser trocada de graça uma vez a cada hora. */
export const TROCA_DA_LISTA_MS = 60 * 60_000;
/** Quantas lutas cada jogador guarda para ver de novo (atacando e defendendo). */
export const LUTAS_GUARDADAS = 20;

/** Pontos por luta: quem ataca e vence ganha 20 (30 se o adversário tinha mais pontos); quem perde, perde 10; quem defende e vence ganha 5. */
export const PONTOS = {
  vitoriaAtacando: 20,
  vitoriaAtacandoQuemTemMais: 30,
  derrotaAtacando: -10,
  derrotaDefendendo: -10,
  vitoriaDefendendo: 5,
} as const;

/** Os pontos de quem ataca e de quem defende depois da luta (empate: os dois perdem; nunca abaixo de 0). */
export function pontosDepoisDaLuta(pontosAtacante: number, pontosDefensor: number, vencedor: 'a' | 'b' | 'ninguem'): { atacante: number; defensor: number } {
  const ganhoA = vencedor === 'a' ? (pontosDefensor > pontosAtacante ? PONTOS.vitoriaAtacandoQuemTemMais : PONTOS.vitoriaAtacando) : PONTOS.derrotaAtacando;
  const ganhoB = vencedor === 'b' ? PONTOS.vitoriaDefendendo : PONTOS.derrotaDefendendo;
  return { atacante: Math.max(0, pontosAtacante + ganhoA), defensor: Math.max(0, pontosDefensor + ganhoB) };
}

export interface FaixaDaArena {
  de: number;
  ate: number | null;
  nome: string;
  ouro: number;
  diamantes: number;
}

/** O pódio semanal (todas as posições ganham; do 101º em diante, quem fez pelo menos 1 luta). */
export const FAIXAS_DA_ARENA: readonly FaixaDaArena[] = [
  { de: 1, ate: 1, nome: '1º lugar', ouro: 5_000, diamantes: 25 },
  { de: 2, ate: 2, nome: '2º lugar', ouro: 3_750, diamantes: 20 },
  { de: 3, ate: 3, nome: '3º lugar', ouro: 3_000, diamantes: 15 },
  { de: 4, ate: 10, nome: '4º ao 10º', ouro: 2_000, diamantes: 10 },
  { de: 11, ate: 50, nome: '11º ao 50º', ouro: 1_250, diamantes: 5 },
  { de: 51, ate: 100, nome: '51º ao 100º', ouro: 750, diamantes: 2 },
  { de: 101, ate: null, nome: 'Participação', ouro: 250, diamantes: 0 },
];
export const faixaDaArena = (posicao: number) => FAIXAS_DA_ARENA.find((f) => posicao >= f.de && (f.ate === null || posicao <= f.ate))!;
export const presenteDaFaixaDaArena = (f: FaixaDaArena): PresenteDoCorreio => ({ ouro: f.ouro, ...(f.diamantes ? { diamantes: f.diamantes } : {}) });

/** Uma luta no histórico do jogador (atacando ou defendendo), com onde está o replay. */
export interface LutaNoHistorico {
  id: string;
  /** O documento do replay (arenaReplays/{id}); a vaga é reaproveitada, então o replay pode não existir mais. */
  replay: string;
  atacou: boolean;
  adversario: string;
  adversarioUid: string;
  venceu: boolean;
  empate?: boolean;
  /** Pontos ganhos (positivo) ou perdidos (negativo) nesta luta. */
  pontos: number;
  em: string;
}

export interface AdversarioNaLista {
  uid: string;
  nome: string;
  nivel: number;
  classeId: string;
  pontos: number;
}

/** arena/{semana}/jogadores/{uid}: o jogador na semana da Arena. */
export interface EntradaDaArena {
  uid: string;
  semana: string;
  nome: string;
  nivel: number;
  classeId: string;
  pontos: number;
  /** Lutas feitas na semana (atacando). */
  lutas: number;
  /** Limite silencioso (6.5-7): a entrada fica à parte (não aparece em listas nem no pódio). */
  oculto?: boolean;
  /** O dia (AAAA-MM-DD de Brasília) dos contadores abaixo. */
  dia?: string;
  lutasHoje?: number;
  comprasHoje?: number;
  lista?: { adversarios: AdversarioNaLista[]; trocadaEm: string };
  historico?: LutaNoHistorico[];
  /** A próxima vaga de replay deste jogador (0 a 19). */
  proximaVaga?: number;
}

/** O replay de uma luta: o log completo, para a tela mostrar de novo. */
export interface ReplayDaArena {
  id: string;
  lutaId: string;
  atacante: string;
  defensor: string;
  em: string;
  resultado: unknown;
}

/** No personagem: as semanas em que ele lutou ou foi atacado (para o prêmio e para apagar os dados da conta). */
export interface SemanaNaArena {
  semana: string;
  /** O prêmio da semana já foi para o Correio. */
  premiada?: boolean;
}
export const SEMANAS_GUARDADAS = 60;

/** Quantas lutas o jogador ainda tem hoje (as grátis mais as compradas). */
export function lutasRestantes(e: Pick<EntradaDaArena, 'dia' | 'lutasHoje' | 'comprasHoje'> | null, hoje: string): { restantes: number; compradas: number; podeComprar: boolean } {
  const doDia = e && e.dia === hoje;
  const usadas = doDia ? e.lutasHoje ?? 0 : 0;
  const compradas = doDia ? e.comprasHoje ?? 0 : 0;
  return { restantes: Math.max(0, LUTAS_GRATIS_POR_DIA + compradas - usadas), compradas, podeComprar: compradas < COMPRAS_DE_LUTA_POR_DIA };
}

export function entradaDaArenaDoDocumento(bruto: unknown): EntradaDaArena | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const e = bruto as EntradaDaArena;
  if (typeof e.uid !== 'string' || typeof e.semana !== 'string' || typeof e.pontos !== 'number') return null;
  return {
    uid: e.uid,
    semana: e.semana,
    nome: String(e.nome ?? ''),
    nivel: Number(e.nivel) || 1,
    classeId: String(e.classeId ?? ''),
    pontos: Math.max(0, Math.floor(e.pontos)),
    lutas: Number(e.lutas) || 0,
    ...(e.oculto ? { oculto: true } : {}),
    ...(typeof e.dia === 'string' ? { dia: e.dia, lutasHoje: Number(e.lutasHoje) || 0, comprasHoje: Number(e.comprasHoje) || 0 } : {}),
    ...(e.lista && Array.isArray(e.lista.adversarios) ? { lista: { adversarios: e.lista.adversarios.slice(0, ADVERSARIOS_NA_LISTA), trocadaEm: String(e.lista.trocadaEm) } } : {}),
    ...(Array.isArray(e.historico) ? { historico: e.historico.slice(-LUTAS_GUARDADAS) } : {}),
    ...(typeof e.proximaVaga === 'number' ? { proximaVaga: e.proximaVaga } : {}),
  };
}

export function semanasNaArenaDoDocumento(bruto: unknown): SemanaNaArena[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  return bruto
    .filter((x): x is SemanaNaArena => !!x && typeof (x as SemanaNaArena).semana === 'string')
    .map((x) => ({ semana: x.semana, ...(x.premiada ? { premiada: true } : {}) }))
    .slice(-SEMANAS_GUARDADAS);
}
