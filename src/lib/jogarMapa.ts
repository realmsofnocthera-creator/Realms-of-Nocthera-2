import type { MapaDados } from '@/rules/mapa';
import { dentroDoMapa as dentro, tileLivre } from '@/rules/passagem';
import { NOME_DO_OBJETO, objetoCobre, type ObjetoDoMapa } from '@/rules/objetosDoMapa';

/**
 * "Jogar o mapa" (3.5.6.6), sem React: o Mestre anda pelo mapa tile a tile para testá-lo antes de publicar.
 * É só um teste dentro do painel: nada é gravado e as lutas, itens e viagens apenas aparecem como aviso.
 * Regras: a colisão do mapa e NPCs, placas e baús bloqueiam o passo; início e portas se pisam; as portas "pisar"
 * levam ao destino ao entrar; a área de monstros dispara ao ENTRAR nela (não ao andar dentro dela); o resto
 * (NPC, placa, baú e portas "interagir") é acionado com o botão de interagir, olhando para o objeto.
 */
export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';

export const PASSO: Readonly<Record<Direcao, { dx: number; dy: number }>> = {
  cima: { dx: 0, dy: -1 },
  baixo: { dx: 0, dy: 1 },
  esquerda: { dx: -1, dy: 0 },
  direita: { dx: 1, dy: 0 },
};

export interface EstadoDeJogo {
  mapaId: string;
  mapa: MapaDados;
  x: number;
  y: number;
  olhando: Direcao;
  /** Baús já abertos nesta sessão de teste. */
  abertos: string[];
  /** O mapa não tem início do jogador: o teste começou no primeiro tile livre. */
  semInicio: boolean;
}

export type EventoDeJogo =
  | { tipo: 'texto'; titulo: string; texto: string }
  | { tipo: 'item'; objetoId: string; item: { id: string; qtd: number } }
  | { tipo: 'bau-vazio' }
  | { tipo: 'porta'; objetoId: string; destino: { mapa: string; x: number; y: number } }
  | { tipo: 'luta'; objetoId: string; monstroId: string }
  | { tipo: 'nada'; motivo: string };

function objetoDeUmTile(mapa: MapaDados, x: number, y: number): ObjetoDoMapa | undefined {
  return mapa.objetos.find((o) => o.tipo !== 'cacada' && o.x === x && o.y === y);
}

/** O primeiro tile livre, da esquerda para a direita e de cima para baixo (ou null se não houver). */
function primeiroTileLivre(mapa: MapaDados): { x: number; y: number } | null {
  for (let y = 0; y < mapa.altura; y++) for (let x = 0; x < mapa.largura; x++) if (tileLivre(mapa, x, y)) return { x, y };
  return null;
}

/** Começa o teste no início do jogador (ou no primeiro tile livre, se o mapa não tiver início). */
export function iniciarJogo(mapaId: string, mapa: MapaDados, aberto?: { x: number; y: number }): EstadoDeJogo {
  const inicio = mapa.objetos.find((o) => o.tipo === 'inicio');
  const livre = primeiroTileLivre(mapa);
  const posicao = aberto && dentro(mapa, aberto.x, aberto.y) ? aberto : inicio ? { x: inicio.x, y: inicio.y } : (livre ?? { x: 0, y: 0 });
  return { mapaId, mapa, x: posicao.x, y: posicao.y, olhando: 'baixo', abertos: [], semInicio: !inicio };
}

function areasDeMonstros(mapa: MapaDados, x: number, y: number): ObjetoDoMapa[] {
  return mapa.objetos.filter((o) => o.tipo === 'cacada' && objetoCobre(o, x, y));
}

/** Um passo na direção. Sempre vira o jogador; só anda se o tile estiver livre. Devolve o estado novo e o que aconteceu. */
export function andar(estado: EstadoDeJogo, dir: Direcao): { estado: EstadoDeJogo; eventos: EventoDeJogo[] } {
  const { dx, dy } = PASSO[dir];
  const nx = estado.x + dx;
  const ny = estado.y + dy;
  if (!tileLivre(estado.mapa, nx, ny)) return { estado: { ...estado, olhando: dir }, eventos: [] };

  const novo: EstadoDeJogo = { ...estado, x: nx, y: ny, olhando: dir };
  const eventos: EventoDeJogo[] = [];
  const porta = objetoDeUmTile(estado.mapa, nx, ny);
  if (porta?.tipo === 'porta' && porta.gatilho === 'pisar' && porta.destino) {
    eventos.push({ tipo: 'porta', objetoId: porta.id, destino: { ...porta.destino } });
    return { estado: novo, eventos };
  }
  const antes = new Set(areasDeMonstros(estado.mapa, estado.x, estado.y).map((o) => o.id));
  const entrou = areasDeMonstros(estado.mapa, nx, ny).find((o) => !antes.has(o.id));
  if (entrou) eventos.push({ tipo: 'luta', objetoId: entrou.id, monstroId: entrou.monstroId ?? '' });
  return { estado: novo, eventos };
}

/** Interagir com o que está à frente (ou com a porta "interagir" em que o jogador está parado). */
export function interagir(estado: EstadoDeJogo): { estado: EstadoDeJogo; eventos: EventoDeJogo[] } {
  const { dx, dy } = PASSO[estado.olhando];
  const naFrente = dentro(estado.mapa, estado.x + dx, estado.y + dy) ? objetoDeUmTile(estado.mapa, estado.x + dx, estado.y + dy) : undefined;
  const embaixo = objetoDeUmTile(estado.mapa, estado.x, estado.y);
  const alvo = naFrente && naFrente.tipo !== 'inicio' ? naFrente : embaixo?.tipo === 'porta' ? embaixo : undefined;
  if (!alvo) return { estado, eventos: [{ tipo: 'nada', motivo: 'Não há nada para interagir aí.' }] };

  switch (alvo.tipo) {
    case 'npc':
      return { estado, eventos: [{ tipo: 'texto', titulo: alvo.nome || 'NPC', texto: alvo.texto?.trim() || '(o NPC ainda não tem fala escrita)' }] };
    case 'placa':
      return { estado, eventos: [{ tipo: 'texto', titulo: 'Placa', texto: alvo.texto?.trim() || '(a placa ainda não tem texto)' }] };
    case 'bau':
      if (estado.abertos.includes(alvo.id)) return { estado, eventos: [{ tipo: 'bau-vazio' }] };
      return { estado: { ...estado, abertos: [...estado.abertos, alvo.id] }, eventos: alvo.item ? [{ tipo: 'item', objetoId: alvo.id, item: { ...alvo.item } }] : [{ tipo: 'bau-vazio' }] };
    case 'porta':
      if (alvo.gatilho === 'interagir' && alvo.destino) return { estado, eventos: [{ tipo: 'porta', objetoId: alvo.id, destino: { ...alvo.destino } }] };
      return { estado, eventos: [{ tipo: 'nada', motivo: 'Esta porta abre ao pisar nela.' }] };
    default:
      return { estado, eventos: [{ tipo: 'nada', motivo: `${NOME_DO_OBJETO[alvo.tipo]}: nada para interagir.` }] };
  }
}

export { tileLivre };
