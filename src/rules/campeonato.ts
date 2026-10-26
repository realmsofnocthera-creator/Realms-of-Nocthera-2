import { RANQUES } from './arenaRanqueada';
import type { PresenteDoCorreio } from './correio';

/**
 * Campeonato (7.5, decidido pelo Yuri em 24 a 26/10/2026). Quinzenal, aos sábados às 20h de Brasília, a partir de
 * 7/11/2026. Entram sozinhos os do Ascendente para cima na Arena ranqueada às 20h; a chave vai pelos pontos (o 1º
 * enfrenta o último) e, se o número não fechar a chave, os de mais pontos passam direto na primeira rodada. Com menos
 * de 32, a edição não acontece (aviso a todos pelo Correio). As lutas são automáticas, uma rodada a cada 5 minutos;
 * no empate passa quem terminou com mais vida em %, e com a mesma vida, quem tinha mais pontos. Os prêmios vão pelo
 * Correio por colocação; o campeão ganha também um baú de escolha mítico (carta ou emblema) e um título que evolui com
 * os campeonatos ganhos. As molduras esperam a arte. Os valores são proposta do Claude, aprovada pelo Yuri em 26/10/2026.
 */

export const PRIMEIRO_CAMPEONATO = '2026-11-07';
export const DIAS_ENTRE_CAMPEONATOS = 14;
export const HORA_DO_CAMPEONATO_EM_BRASILIA = 20;
export const MINUTOS_POR_RODADA = 5;
export const MINIMO_DE_JOGADORES = 32;
/** Teto da chave (as recompensas e o histórico de cada um são lidos por jogador; a chave cabe num documento). */
export const MAXIMO_DE_JOGADORES = 256;
export const PONTOS_PARA_ENTRAR = RANQUES.find((r) => r.id === 'ascendente')!.minimo;

const DIA_MS = 86_400_000;
const dataEmMs = (dia: string) => Date.parse(`${dia}T12:00:00.000Z`);
const somarDias = (dia: string, n: number) => new Date(dataEmMs(dia) + n * DIA_MS).toISOString().slice(0, 10);

/** O dia (AAAA-MM-DD) tem Campeonato? */
export function temCampeonato(dia: string): boolean {
  const dias = Math.round((dataEmMs(dia) - dataEmMs(PRIMEIRO_CAMPEONATO)) / DIA_MS);
  return dias >= 0 && dias % DIAS_ENTRE_CAMPEONATOS === 0;
}

/** O Campeonato de hoje (se tiver) ou o próximo. */
export function proximoCampeonato(dia: string): string {
  if (dataEmMs(dia) <= dataEmMs(PRIMEIRO_CAMPEONATO)) return PRIMEIRO_CAMPEONATO;
  const dias = Math.round((dataEmMs(dia) - dataEmMs(PRIMEIRO_CAMPEONATO)) / DIA_MS);
  const resto = dias % DIAS_ENTRE_CAMPEONATOS;
  return resto === 0 ? dia : somarDias(dia, DIAS_ENTRE_CAMPEONATOS - resto);
}

/** As últimas `n` edições até `dia` (inclusive), da mais nova para a mais antiga. */
export function edicoesAte(dia: string, n: number): string[] {
  const proxima = proximoCampeonato(dia);
  let atual = proxima === dia ? dia : somarDias(proxima, -DIAS_ENTRE_CAMPEONATOS);
  const lista: string[] = [];
  while (lista.length < n && dataEmMs(atual) >= dataEmMs(PRIMEIRO_CAMPEONATO)) {
    lista.push(atual);
    atual = somarDias(atual, -DIAS_ENTRE_CAMPEONATOS);
  }
  return lista;
}

/** Quando a chave é montada (20h de Brasília = 23h UTC) e quando cada rodada é resolvida (5 minutos depois da anterior). */
export const inicioDoCampeonato = (dia: string) => new Date(`${dia}T${String(HORA_DO_CAMPEONATO_EM_BRASILIA + 3).padStart(2, '0')}:00:00.000Z`);
export const horaDaRodada = (dia: string, rodada: number) => new Date(inicioDoCampeonato(dia).getTime() + (rodada + 1) * MINUTOS_POR_RODADA * 60_000);

/** O tamanho da chave: a menor potência de 2 que cabe todos. */
export const tamanhoDaChave = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/**
 * A ordem das posições na chave (cabeças de chave): 1 e 2 só se encontram na final, 1 a 4 só nas semifinais, e assim
 * por diante. Ex.: 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function ordemDaChave(tamanho: number): number[] {
  let ordem = [1];
  while (ordem.length < tamanho) {
    const n = ordem.length * 2;
    ordem = ordem.flatMap((s) => [s, n + 1 - s]);
  }
  return ordem;
}

export interface JogadorNoCampeonato {
  uid: string;
  nome: string;
  nivel: number;
  classeId: string;
  pontos: number;
}

/** Uma luta da chave: os índices dos jogadores (em `jogadores`); null = passou direto (sem adversário). */
export interface LutaDoCampeonato {
  a: number;
  b: number | null;
  vencedor?: number;
  /** A luta (semente e fichas) fica em arenaReplays/{replay}. */
  replay?: string;
  vidaA?: number;
  vidaB?: number;
}

/** campeonatos/{dia}: a edição. */
export interface CampeonatoDoDia {
  dia: string;
  estado: 'cancelado' | 'andamento' | 'encerrado';
  jogadores: JogadorNoCampeonato[];
  /** Cada rodada: as lutas na ordem da chave. A rodada seguinte só existe depois que a anterior foi resolvida. */
  rodadas: LutaDoCampeonato[][];
  criadoEm: string;
}

/** A primeira rodada: os jogadores (já por pontos, do maior para o menor) nas posições da chave. */
export function primeiraRodada(n: number): LutaDoCampeonato[] {
  const ordem = ordemDaChave(tamanhoDaChave(n));
  const lutas: LutaDoCampeonato[] = [];
  for (let i = 0; i < ordem.length; i += 2) {
    const a = ordem[i] - 1;
    const b = ordem[i + 1] - 1;
    lutas.push({ a, b: b < n ? b : null });
  }
  return lutas;
}

/** A rodada seguinte: os vencedores, dois a dois, na ordem da chave. */
export const proximaRodada = (anterior: readonly LutaDoCampeonato[]): LutaDoCampeonato[] =>
  Array.from({ length: anterior.length / 2 }, (_, i) => ({ a: anterior[2 * i].vencedor!, b: anterior[2 * i + 1].vencedor! }));

export const totalDeRodadas = (n: number) => Math.log2(tamanhoDaChave(n));

export interface FaixaDoCampeonato {
  id: string;
  nome: string;
  ouro: number;
  diamantes: number;
  selos: { encantado?: number; eternidade?: number; origem?: number };
  /** Campeão: baú de escolha mítico (carta ou emblema). */
  bauMitico?: true;
}

export const FAIXAS_DO_CAMPEONATO: readonly FaixaDoCampeonato[] = [
  { id: 'campeao', nome: 'Campeão', ouro: 10_000, diamantes: 100, selos: { origem: 30 }, bauMitico: true },
  { id: 'vice', nome: 'Vice-campeão', ouro: 6_000, diamantes: 60, selos: { origem: 10, eternidade: 10 } },
  { id: 'semifinal', nome: '3º e 4º', ouro: 4_000, diamantes: 40, selos: { origem: 5, eternidade: 5 } },
  { id: 'quartas', nome: '5º ao 8º', ouro: 2_500, diamantes: 25, selos: { eternidade: 10 } },
  { id: 'oitavas', nome: '9º ao 16º', ouro: 1_500, diamantes: 15, selos: { eternidade: 5 } },
  { id: 'dezesseis', nome: '17º ao 32º', ouro: 1_000, diamantes: 10, selos: { encantado: 20 } },
  { id: 'demais', nome: '33º em diante', ouro: 500, diamantes: 5, selos: { encantado: 10 } },
];

/**
 * A faixa de quem caiu na rodada `rodada` (0 = a primeira) de um campeonato com `total` rodadas; quem ganhou a última
 * é o campeão (rodada = total).
 */
export function faixaPelaRodada(rodada: number, total: number): FaixaDoCampeonato {
  const daFinal = total - rodada; // 0 = campeão, 1 = vice (caiu na final), 2 = semifinal…
  return FAIXAS_DO_CAMPEONATO[Math.min(Math.max(0, daFinal), FAIXAS_DO_CAMPEONATO.length - 1)];
}

export const presenteDaFaixaDoCampeonato = (f: FaixaDoCampeonato): PresenteDoCorreio => ({ ouro: f.ouro, diamantes: f.diamantes, selos: { ...f.selos } });

/** Os títulos do campeão, pelo número de campeonatos ganhos. */
export const TITULOS_DO_CAMPEAO: readonly { vitorias: number; titulo: string }[] = [
  { vitorias: 1, titulo: 'campeao-de-nocthera' },
  { vitorias: 2, titulo: 'bicampeao-de-nocthera' },
  { vitorias: 3, titulo: 'tricampeao-de-nocthera' },
  { vitorias: 5, titulo: 'lenda-de-nocthera' },
];
export const tituloPelasVitorias = (vitorias: number) => TITULOS_DO_CAMPEAO.find((t) => t.vitorias === vitorias)?.titulo;

export function campeonatoDoDocumento(dia: string, bruto: unknown): CampeonatoDoDia | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const c = bruto as CampeonatoDoDia;
  if (!['cancelado', 'andamento', 'encerrado'].includes(c.estado) || !Array.isArray(c.jogadores) || !Array.isArray(c.rodadas)) return null;
  return { dia, estado: c.estado, jogadores: c.jogadores, rodadas: c.rodadas.map((r) => (Array.isArray(r) ? r : (r as { lutas: LutaDoCampeonato[] }).lutas ?? [])), criadoEm: String(c.criadoEm ?? '') };
}
