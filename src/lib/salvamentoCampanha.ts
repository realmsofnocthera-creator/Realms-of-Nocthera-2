/**
 * Quando o celular salva a posição na Campanha (5.5-8). O objetivo é gastar pouquíssimas gravações do banco (o plano
 * gratuito do Firebase limita as gravações por dia) sem o jogador perder progresso que importe:
 *
 * - Andar NÃO grava. O servidor só confere se o tile de chegada é alcançável por caminho livre, então não importa
 *   quanto o jogador andou desde o último salvamento.
 * - Baú e porta gravam sozinhos e levam a posição junto: ação importante = uma gravação, já com o checkpoint.
 * - Parou de andar por um tempo: grava (o jogador provavelmente largou o celular).
 * - Saiu da tela (voltou ao menu, trocou de aplicativo, fechou): grava na hora.
 * - Andando sem parar por muito tempo: grava de vez em quando, para uma queda de bateria não perder tudo.
 * - Nunca duas gravações muito juntas, e nunca se a posição não mudou desde a última.
 *
 * Numa sessão normal isso dá de 2 a 6 gravações, contra centenas se cada passo fosse salvo.
 */
export const SILENCIO_PARA_SALVAR_MS = 20_000;
export const INTERVALO_MINIMO_MS = 45_000;
export const INTERVALO_MAXIMO_ANDANDO_MS = 180_000;

export interface PontoDaCampanha {
  mapaId: string;
  x: number;
  y: number;
}

export interface SituacaoDoSalvamento {
  agora: number;
  /** Onde o jogador está agora. */
  posicao: PontoDaCampanha;
  /** A última posição que o servidor confirmou. */
  salva: PontoDaCampanha | null;
  ultimoPassoEm: number;
  ultimoSalvamentoEm: number;
  /** O jogador está saindo da tela (menu, outro aplicativo, fechar): salvar já, sem esperar. */
  saindo?: boolean;
}

const igual = (a: PontoDaCampanha | null, b: PontoDaCampanha) => a !== null && a.mapaId === b.mapaId && a.x === b.x && a.y === b.y;

export function deveSalvarPosicao(s: SituacaoDoSalvamento): boolean {
  if (igual(s.salva, s.posicao)) return false;
  if (s.saindo) return true;
  const desdeOSalvamento = s.agora - s.ultimoSalvamentoEm;
  if (desdeOSalvamento < INTERVALO_MINIMO_MS) return false;
  if (s.agora - s.ultimoPassoEm >= SILENCIO_PARA_SALVAR_MS) return true;
  return desdeOSalvamento >= INTERVALO_MAXIMO_ANDANDO_MS;
}
