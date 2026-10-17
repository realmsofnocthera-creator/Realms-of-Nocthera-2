import type { MapaDados } from '@/rules/mapa';
import { NOME_DO_OBJETO, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { dentroDoMapa, tileLivre } from '@/rules/passagem';

/**
 * Verificação do mapa antes de publicar (3.5.6.6 e 3.5.6.2). Devolve problemas de dois níveis:
 *  - "erro": o mapa publicado quebraria o jogo (início preso numa parede, porta que leva para fora do mapa de
 *    destino ou para um tile bloqueado). O servidor recusa a publicação enquanto houver erro.
 *  - "aviso": provavelmente não é o que se quer (sem início, objeto que o jogador não alcança, mapa sem saída ou
 *    isolado). Não impede de publicar.
 * `outros` são os demais mapas (rascunhos mais recentes), por id, para conferir destinos de portas e ligações.
 */
export interface ProblemaDoMapa {
  nivel: 'erro' | 'aviso';
  texto: string;
  /** O objeto do mapa a que o problema se refere, se houver. */
  objetoId?: string;
}

const VIZINHOS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

/** Tiles que o jogador alcança a partir de (x0, y0), andando pelos tiles livres. */
export function tilesAlcancaveis(mapa: MapaDados, x0: number, y0: number): Set<number> {
  const visto = new Set<number>();
  if (!tileLivre(mapa, x0, y0)) return visto;
  const fila: [number, number][] = [[x0, y0]];
  visto.add(y0 * mapa.largura + x0);
  while (fila.length) {
    const [x, y] = fila.pop()!;
    for (const [dx, dy] of VIZINHOS) {
      const nx = x + dx;
      const ny = y + dy;
      const i = ny * mapa.largura + nx;
      if (!visto.has(i) && tileLivre(mapa, nx, ny)) {
        visto.add(i);
        fila.push([nx, ny]);
      }
    }
  }
  return visto;
}

function alcancado(mapa: MapaDados, o: ObjetoDoMapa, visto: Set<number>): boolean {
  const tem = (x: number, y: number) => dentroDoMapa(mapa, x, y) && visto.has(y * mapa.largura + x);
  if (o.tipo === 'cacada') {
    for (let y = o.y; y < o.y + (o.altura ?? 1); y++) for (let x = o.x; x < o.x + (o.largura ?? 1); x++) if (tem(x, y)) return true;
    return false;
  }
  if (o.tipo === 'inicio' || o.tipo === 'porta') return tem(o.x, o.y);
  return VIZINHOS.some(([dx, dy]) => tem(o.x + dx, o.y + dy)); // NPC, placa e baú: basta chegar ao lado
}

export function verificarMapa(id: string, mapa: MapaDados, outros: Readonly<Record<string, MapaDados | undefined>> = {}): ProblemaDoMapa[] {
  const problemas: ProblemaDoMapa[] = [];
  const nome = (o: ObjetoDoMapa) => `${NOME_DO_OBJETO[o.tipo]} (${o.id}, em ${o.x}, ${o.y})`;
  const inicio = mapa.objetos.find((o) => o.tipo === 'inicio');

  if (!inicio) {
    problemas.push({ nivel: 'aviso', texto: 'O mapa não tem o início do jogador. O jogador só chega aqui por uma porta; sem porta apontando para cá, não chega.' });
  } else if (!tileLivre(mapa, inicio.x, inicio.y)) {
    problemas.push({ nivel: 'erro', texto: `O início do jogador (${inicio.x}, ${inicio.y}) está num tile bloqueado pela colisão.`, objetoId: inicio.id });
  }

  // alcance a partir do início (ou do primeiro tile livre, se não houver início)
  let origem: { x: number; y: number } | null = inicio && tileLivre(mapa, inicio.x, inicio.y) ? { x: inicio.x, y: inicio.y } : null;
  if (!origem && !inicio) {
    for (let y = 0; y < mapa.altura && !origem; y++) for (let x = 0; x < mapa.largura && !origem; x++) if (tileLivre(mapa, x, y)) origem = { x, y };
  }
  const visto = origem ? tilesAlcancaveis(mapa, origem.x, origem.y) : new Set<number>();

  if (origem) {
    for (const o of mapa.objetos) {
      if (o.tipo === 'inicio') continue;
      if (!alcancado(mapa, o, visto)) problemas.push({ nivel: 'aviso', texto: `${nome(o)}: o jogador não consegue chegar até aqui a partir do início.`, objetoId: o.id });
    }
  }

  const portas = mapa.objetos.filter((o) => o.tipo === 'porta');
  for (const p of portas) {
    if (!p.destino) continue;
    const alvo = p.destino.mapa === id ? mapa : outros[p.destino.mapa];
    if (!alvo) {
      problemas.push({ nivel: 'erro', texto: `${nome(p)}: o mapa de destino "${p.destino.mapa}" não foi encontrado.`, objetoId: p.id });
      continue;
    }
    if (!dentroDoMapa(alvo, p.destino.x, p.destino.y)) {
      problemas.push({ nivel: 'erro', texto: `${nome(p)}: o destino (${p.destino.x}, ${p.destino.y}) fica fora do mapa "${p.destino.mapa}" (${alvo.largura} × ${alvo.altura}).`, objetoId: p.id });
    } else if (!tileLivre(alvo, p.destino.x, p.destino.y)) {
      problemas.push({ nivel: 'erro', texto: `${nome(p)}: o destino (${p.destino.x}, ${p.destino.y}) em "${p.destino.mapa}" está bloqueado (colisão, NPC, placa ou baú).`, objetoId: p.id });
    }
  }

  const saidas = portas.filter((p) => p.destino && alcancado(mapa, p, visto));
  const recebe = Object.entries(outros).some(([outroId, m]) => outroId !== id && m?.objetos.some((o) => o.tipo === 'porta' && o.destino?.mapa === id));
  if (origem && portas.length > 0 && saidas.length === 0) {
    problemas.push({ nivel: 'aviso', texto: 'Nenhuma porta é alcançável a partir do início: o jogador fica preso neste mapa.' });
  }
  if (portas.length === 0 && !recebe) {
    problemas.push({ nivel: 'aviso', texto: 'Mapa isolado: não tem portas e nenhuma porta de outro mapa leva até ele.' });
  } else if (portas.length === 0) {
    problemas.push({ nivel: 'aviso', texto: 'O mapa não tem portas: o jogador que entra aqui não tem como sair.' });
  } else if (!recebe && !inicio) {
    problemas.push({ nivel: 'aviso', texto: 'Nenhuma porta de outro mapa leva até aqui e não há início do jogador: ninguém chega a este mapa.' });
  }

  // objetos sobre colisão (inútil ou enganoso)
  for (const o of mapa.objetos) {
    if (o.tipo === 'cacada' || o.tipo === 'inicio') continue;
    if (mapa.camadas.colisao[o.y * mapa.largura + o.x] === 1) problemas.push({ nivel: 'aviso', texto: `${nome(o)} está sobre um tile com colisão.`, objetoId: o.id });
  }
  return problemas;
}

export const TEM_ERRO = (p: readonly ProblemaDoMapa[]) => p.some((x) => x.nivel === 'erro');
