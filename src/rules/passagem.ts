import type { MapaDados } from '@/rules/mapa';

/**
 * Onde o jogador pode pisar (3.5.6.6): dentro do mapa, sem colisão e sem NPC, placa ou baú. O início, as portas e as
 * áreas de monstros se pisam. É a mesma regra do "jogar o mapa" e da verificação do mapa antes de publicar.
 */
const OBJETOS_SOLIDOS = new Set(['npc', 'placa', 'bau']);

export function dentroDoMapa(mapa: Pick<MapaDados, 'largura' | 'altura'>, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < mapa.largura && y < mapa.altura;
}

export function tileLivre(mapa: MapaDados, x: number, y: number): boolean {
  if (!dentroDoMapa(mapa, x, y)) return false;
  if (mapa.camadas.colisao[y * mapa.largura + x] === 1) return false;
  const o = mapa.objetos.find((obj) => obj.tipo !== 'cacada' && obj.x === x && obj.y === y);
  return !(o && OBJETOS_SOLIDOS.has(o.tipo));
}
