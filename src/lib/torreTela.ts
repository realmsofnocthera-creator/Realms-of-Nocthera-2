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
    return { andar: null, vencidos, completa: true, bloqueio: null, nome: null, chefe: false, efeitos: null, estrela: null, recompensas: [], proximoChefe: null };
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
    chefe: id.chefe,
    efeitos: id.efeitos ?? null,
    estrela: estrelaDoAndar(andar),
    recompensas: recompensasEmTexto(andar, c.nivel),
    proximoChefe: chefe ? { andar: chefe.andar, nome: chefe.nome, efeitos: chefe.efeitos, faltam: chefe.andar - andar } : null,
  };
}
