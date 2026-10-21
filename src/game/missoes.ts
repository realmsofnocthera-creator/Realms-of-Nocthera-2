import { condicaoNaoAtendida, type CondicaoDeAcesso, type SituacaoDoJogador } from '@/rules/condicao';
import { metaDoObjetivo, type MissaoDados, type ObjetivoDaMissao } from '@/rules/missao';

/**
 * Missões da Campanha (5.5-5), regras puras: o estado de cada missão do personagem, como os acontecimentos do jogo
 * (falar com um NPC, ver uma cena, abrir um baú, vencer uma luta, chegar a um mapa) andam os objetivos, quando a
 * missão começa e quando conclui. As recompensas são entregues pelo servidor, na mesma gravação da ação.
 */
export type EstadoDaMissao = 'ativa' | 'concluida';

export interface MissaoDoJogador {
  estado: EstadoDaMissao;
  /** Quantas vezes cada objetivo aconteceu (id do objetivo → contagem). Objetivos de item não ficam aqui: contam a mochila. */
  progresso: Record<string, number>;
  iniciadaEm: string;
  concluidaEm?: string;
}
export type MissoesDoJogador = Record<string, MissaoDoJogador>;

/** Quantas missões guardamos por personagem (o documento do banco tem tamanho máximo). */
export const MAXIMO_DE_MISSOES_GUARDADAS = 200;

export type EventoDeMissao =
  | { tipo: 'falar'; mapa: string; objeto: string }
  | { tipo: 'cena'; cenaId: string }
  | { tipo: 'bau'; mapa: string; objeto: string }
  | { tipo: 'derrotar'; monstroId: string }
  | { tipo: 'chegar'; mapa: string };

/** A chave guardada em `cenas` (ao lado de "abertura" e "mapa:objeto") para "o jogador já viu a cena X". */
export const chaveDaCenaVista = (cenaId: string) => `cena:${cenaId}`;

export function idsDasMissoes(missoes: MissoesDoJogador | undefined, estado: EstadoDaMissao): string[] {
  return Object.entries(missoes ?? {})
    .filter(([, m]) => m.estado === estado)
    .map(([id]) => id);
}

/** O que a condição de um objeto precisa saber do jogador. */
export function situacaoDoJogador(personagem: { nivel: number; inventario?: Readonly<Record<string, number>> }, progresso: { missoes?: MissoesDoJogador; cenas?: readonly string[] }): SituacaoDoJogador {
  return {
    nivel: personagem.nivel,
    inventario: personagem.inventario ?? {},
    missoesAtivas: idsDasMissoes(progresso.missoes, 'ativa'),
    missoesConcluidas: idsDasMissoes(progresso.missoes, 'concluida'),
    cenasVistas: (progresso.cenas ?? []).filter((c) => c.startsWith('cena:')).map((c) => c.slice(5)),
  };
}

/** Se o jogador pode passar pelo objeto: null, ou a mensagem do bloqueio. */
export const bloqueioDoObjeto = (condicao: CondicaoDeAcesso | undefined, situacao: SituacaoDoJogador): string | null => condicaoNaoAtendida(condicao, situacao);

/** Quanto do objetivo está feito (de 0 até a meta). Os objetivos de item contam a mochila na hora. */
export function valorDoObjetivo(o: ObjetivoDaMissao, estado: MissaoDoJogador, inventario: Readonly<Record<string, number>>): number {
  const meta = metaDoObjetivo(o);
  const atual = o.tipo === 'item' ? (inventario[o.itemId ?? ''] ?? 0) : (estado.progresso[o.id] ?? 0);
  return Math.min(meta, atual);
}

export const objetivoCumprido = (o: ObjetivoDaMissao, estado: MissaoDoJogador, inventario: Readonly<Record<string, number>>) => valorDoObjetivo(o, estado, inventario) >= metaDoObjetivo(o);

export const missaoCumprida = (def: MissaoDados, estado: MissaoDoJogador, inventario: Readonly<Record<string, number>>) => def.objetivos.every((o) => objetivoCumprido(o, estado, inventario));

/** Por que o jogador não pode começar a missão, ou null se pode. */
export function motivoDeNaoPoderComecar(def: MissaoDados, missoes: MissoesDoJogador, nivel: number): string | null {
  if (nivel < def.requisitos.nivelMinimo) return `Esta missão pede o nível ${def.requisitos.nivelMinimo}.`;
  if (def.requisitos.missoes.some((id) => missoes[id]?.estado !== 'concluida')) return 'Antes, conclua as missões anteriores.';
  return null;
}

/** Aplica um acontecimento aos objetivos de uma missão em andamento. */
function aplicarEvento(def: MissaoDados, m: MissaoDoJogador, e: EventoDeMissao): MissaoDoJogador {
  const progresso = { ...m.progresso };
  for (const o of def.objetivos) {
    const bate =
      (e.tipo === 'falar' && o.tipo === 'falar' && o.mapa === e.mapa && o.objeto === e.objeto) ||
      (e.tipo === 'bau' && o.tipo === 'bau' && o.mapa === e.mapa && o.objeto === e.objeto) ||
      (e.tipo === 'cena' && o.tipo === 'cena' && o.cenaId === e.cenaId) ||
      (e.tipo === 'chegar' && o.tipo === 'chegar' && o.mapa === e.mapa) ||
      (e.tipo === 'derrotar' && o.tipo === 'derrotar' && o.monstroId === e.monstroId);
    if (bate) progresso[o.id] = Math.min(metaDoObjetivo(o), (progresso[o.id] ?? 0) + 1);
  }
  return { ...m, progresso };
}

export interface ResultadoDasMissoes {
  missoes: MissoesDoJogador;
  /** Missões que começaram agora. */
  iniciadas: string[];
  /** Missões que concluíram agora (a recompensa é entregue pelo servidor). */
  concluidas: string[];
  /** Quando um pedido de começar não pôde ser atendido: o motivo (só vale para o primeiro pedido). */
  motivoDoNaoComeco?: string;
}

/**
 * O passo das missões depois de uma ação do jogador: começa as missões pedidas (se o jogador cumpre os requisitos e
 * ainda não as começou), aplica os acontecimentos às que estão em andamento e conclui as que ficaram completas.
 * `defs` são as missões PUBLICADAS; uma missão que deixou de estar publicada fica parada, sem apagar o progresso.
 */
export function processarMissoes(entrada: {
  missoes: MissoesDoJogador | undefined;
  defs: Readonly<Record<string, MissaoDados | undefined>>;
  eventos: readonly EventoDeMissao[];
  iniciar?: readonly string[];
  nivel: number;
  inventario: Readonly<Record<string, number>>;
  agora: string;
}): ResultadoDasMissoes {
  let missoes: MissoesDoJogador = { ...(entrada.missoes ?? {}) };
  const iniciadas: string[] = [];
  const concluidas: string[] = [];
  let motivoDoNaoComeco: string | undefined;

  for (const id of entrada.iniciar ?? []) {
    const def = entrada.defs[id];
    if (!def || missoes[id]) continue; // não publicada ou já começada/concluída: nada a fazer
    const motivo = motivoDeNaoPoderComecar(def, missoes, entrada.nivel);
    if (motivo) {
      motivoDoNaoComeco ??= motivo;
      continue;
    }
    if (Object.keys(missoes).length >= MAXIMO_DE_MISSOES_GUARDADAS) {
      motivoDoNaoComeco ??= 'Não foi possível registrar a missão agora.';
      continue;
    }
    missoes = { ...missoes, [id]: { estado: 'ativa', progresso: {}, iniciadaEm: entrada.agora } };
    iniciadas.push(id);
  }

  for (const [id, m] of Object.entries(missoes)) {
    const def = entrada.defs[id];
    if (m.estado !== 'ativa' || !def) continue;
    let atual = m;
    for (const e of entrada.eventos) atual = aplicarEvento(def, atual, e);
    if (missaoCumprida(def, atual, entrada.inventario)) {
      atual = { ...atual, estado: 'concluida', concluidaEm: entrada.agora };
      concluidas.push(id);
    }
    if (atual !== m) missoes = { ...missoes, [id]: atual };
  }
  return { missoes, iniciadas, concluidas, ...(motivoDoNaoComeco ? { motivoDoNaoComeco } : {}) };
}

/** Um resumo da missão para o jogador: título, descrição, cada objetivo com o andamento e a recompensa. */
export interface ResumoDaMissao {
  id: string;
  titulo: string;
  descricao: string;
  estado: EstadoDaMissao;
  objetivos: { id: string; texto: string; atual: number; meta: number; cumprido: boolean }[];
  recompensa: MissaoDados['recompensa'];
}
