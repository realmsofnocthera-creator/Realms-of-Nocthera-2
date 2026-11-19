import type { CharacterDocument } from '@/server/characterService';
import {
  andarAtual,
  conferirEntradaTorre,
  estrelaDoAndar,
  identidadeDoAndar,
  NIVEL_TORRE,
  proximoChefe,
  recompensaDoAndar,
  TORRE,
} from '@/game/torreCelestial';

/** Lógica da tela da Torre Celestial (andar atual, recompensas e próximo chefe), sem React. */

type Personagem = Pick<CharacterDocument, 'nivel' | 'torreAndar'>;

export interface RecompensaTela {
  rotulo: string;
  valor: number;
}

export interface TorreTela {
  /** O andar que o personagem enfrenta agora (1 a 300); null quando a Torre está completa. */
  andar: number | null;
  vencidos: number;
  completa: boolean;
  bloqueio: string | null;
  nome: string | null;
  /** O id do monstro ou chefe do andar (para a arte). */
  monstroId: string | null;
  chefe: boolean;
  efeitos: string | null;
  estrela: number | null;
  recompensas: RecompensaTela[];
  proximoChefe: { andar: number; nome: string; efeitos: string; faltam: number } | null;
}

export function recompensasEmTexto(andar: number, nivel: number): RecompensaTela[] {
  const r = recompensaDoAndar(andar, nivel);
  const lista: RecompensaTela[] = [];
  if (r.xp > 0) lista.push({ rotulo: 'XP', valor: r.xp });
  if (r.essenciaHabilidade > 0) lista.push({ rotulo: 'Essência de habilidade', valor: r.essenciaHabilidade });
  if (r.diamantes > 0) lista.push({ rotulo: 'Diamantes', valor: r.diamantes });
  if (r.fragmentosAscensao > 0) lista.push({ rotulo: 'Fragmento de ascensão', valor: r.fragmentosAscensao });
  return lista;
}

export function torreDoPersonagem(c: Personagem): TorreTela {
  const vencidos = Math.min(TORRE.andares, c.torreAndar ?? 0);
  const entrada = conferirEntradaTorre(c.nivel, c.torreAndar);
  if (!entrada.ok && entrada.motivo === 'torreCompleta') {
    return { andar: null, vencidos, completa: true, bloqueio: null, nome: null, monstroId: null, chefe: false, efeitos: null, estrela: null, recompensas: [], proximoChefe: null };
  }
  const andar = andarAtual(c.torreAndar);
  const id = identidadeDoAndar(andar);
  const chefe = proximoChefe(andar);
  return {
    andar,
    vencidos,
    completa: false,
    bloqueio: entrada.ok ? null : `Requer nível ${NIVEL_TORRE}`,
    nome: id.nome,
    monstroId: id.monstroId,
    chefe: id.chefe,
    efeitos: id.efeitos ?? null,
    estrela: estrelaDoAndar(andar),
    recompensas: recompensasEmTexto(andar, c.nivel),
    proximoChefe: chefe ? { andar: chefe.andar, nome: chefe.nome, efeitos: chefe.efeitos, faltam: chefe.andar - andar } : null,
  };
}

/** O fundo da torre (0 a 3) para um andar: o céu muda a cada quarto dos 300 andares. */
export function fundoDaTorre(andar: number): number {
  const a = Math.min(TORRE.andares, Math.max(1, andar));
  return Math.min(3, Math.floor(((a - 1) * 4) / TORRE.andares));
}

/** A miniatura de cenário (0 a 5) de um andar: uma a cada 50 andares. */
export function cenarioDoAndar(andar: number): number {
  const a = Math.min(TORRE.andares, Math.max(1, andar));
  return Math.min(5, Math.floor((a - 1) / 50));
}

export interface AndarDaLista {
  andar: number;
  chefe: boolean;
  nome: string;
  atual: boolean;
  recompensas: RecompensaTela[];
}

/** Os andares da lista lateral: o atual e os seguintes (até `quantos`), com o que cada um dá. */
export function andaresDaLista(andarAtualDoPersonagem: number, nivel: number, quantos = 5): AndarDaLista[] {
  const lista: AndarDaLista[] = [];
  for (let a = andarAtualDoPersonagem; a <= TORRE.andares && lista.length < quantos; a++) {
    const id = identidadeDoAndar(a);
    lista.push({ andar: a, chefe: id.chefe, nome: id.nome, atual: a === andarAtualDoPersonagem, recompensas: recompensasEmTexto(a, nivel) });
  }
  return lista;
}
