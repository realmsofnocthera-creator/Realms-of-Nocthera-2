/**
 * Vozes "bip" das cenas (5.5-4): enquanto o texto aparece letra a letra, cada poucas letras toca um bipe curto, no
 * estilo de Undertale e do BlipTalk. O som é gerado no navegador (Web Audio), sem arquivo de áudio: cada voz é só um
 * punhado de números. As predefinições abaixo são pontos de partida, a ajustar de ouvido.
 */
export type FormaDeOnda = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface Voz {
  nome: string;
  /** Timbre: senoide (suave), triangular (macia), quadrada (8 bits), dente de serra (áspera). */
  onda: FormaDeOnda;
  /** Altura base do bipe, em Hz. */
  frequencia: number;
  /** Quanto a altura varia de um bipe para outro, em semitons (para cima e para baixo). */
  variacao: number;
  /** Duração de cada bipe, em ms. */
  duracaoMs: number;
  /** Toca um bipe a cada N letras (espaços e pontuação não contam). */
  cadaLetras: number;
  /** Tempo entre uma letra e a seguinte, em ms (a velocidade da fala). */
  msPorLetra: number;
  /** Deslize da altura durante o bipe, em semitons (negativo desce, positivo sobe). */
  deslize: number;
  /** Volume de 0 a 1. */
  volume: number;
  /** Ruído misturado ao bipe, de 0 a 1 (rosnado, chiado). */
  ruido: number;
}

export const VOZES = {
  'masculina-grave': { nome: 'Masculina grave', onda: 'square', frequencia: 110, variacao: 1, duracaoMs: 70, cadaLetras: 2, msPorLetra: 38, deslize: -1, volume: 0.32, ruido: 0 },
  masculina: { nome: 'Masculina', onda: 'square', frequencia: 165, variacao: 1.5, duracaoMs: 60, cadaLetras: 2, msPorLetra: 34, deslize: 0, volume: 0.3, ruido: 0 },
  feminina: { nome: 'Feminina', onda: 'triangle', frequencia: 330, variacao: 2, duracaoMs: 50, cadaLetras: 2, msPorLetra: 30, deslize: 0.5, volume: 0.42, ruido: 0 },
  'feminina-fina': { nome: 'Feminina fina', onda: 'sine', frequencia: 520, variacao: 2.5, duracaoMs: 40, cadaLetras: 2, msPorLetra: 28, deslize: 1, volume: 0.45, ruido: 0 },
  crianca: { nome: 'Criança', onda: 'triangle', frequencia: 620, variacao: 3, duracaoMs: 35, cadaLetras: 1, msPorLetra: 26, deslize: 1.5, volume: 0.4, ruido: 0 },
  idoso: { nome: 'Idoso', onda: 'triangle', frequencia: 140, variacao: 2.5, duracaoMs: 90, cadaLetras: 3, msPorLetra: 48, deslize: -2, volume: 0.4, ruido: 0.15 },
  sussurro: { nome: 'Sussurro', onda: 'sine', frequencia: 260, variacao: 1, duracaoMs: 45, cadaLetras: 3, msPorLetra: 40, deslize: 0, volume: 0.18, ruido: 0.6 },
  monstro: { nome: 'Monstro', onda: 'sawtooth', frequencia: 62, variacao: 3, duracaoMs: 110, cadaLetras: 3, msPorLetra: 44, deslize: -4, volume: 0.35, ruido: 0.45 },
  espectral: { nome: 'Espectral', onda: 'sine', frequencia: 440, variacao: 6, duracaoMs: 140, cadaLetras: 4, msPorLetra: 42, deslize: 3, volume: 0.25, ruido: 0.1 },
  robo: { nome: 'Autômato', onda: 'square', frequencia: 220, variacao: 0, duracaoMs: 45, cadaLetras: 1, msPorLetra: 30, deslize: 0, volume: 0.22, ruido: 0 },
  narrador: { nome: 'Narrador', onda: 'sine', frequencia: 196, variacao: 0.5, duracaoMs: 55, cadaLetras: 3, msPorLetra: 32, deslize: 0, volume: 0.25, ruido: 0 },
} as const satisfies Record<string, Voz>;

export type IdDaVoz = keyof typeof VOZES;
export const IDS_DE_VOZ = Object.keys(VOZES) as IdDaVoz[];
/** Sem voz: o texto aparece letra a letra, em silêncio. */
export const SEM_VOZ = 'nenhuma';
export const MS_POR_LETRA_SEM_VOZ = 30;

export const ehIdDeVoz = (v: unknown): v is IdDaVoz => typeof v === 'string' && Object.prototype.hasOwnProperty.call(VOZES, v);

/** Letras e números contam para o bipe; espaços e pontuação não (a fala "respira" neles). */
export const letraQueSoa = (c: string) => /[\p{L}\p{N}]/u.test(c);

export interface Bip {
  frequencia: number;
  /** Frequência no fim do bipe (com o deslize). */
  frequenciaFinal: number;
  duracaoMs: number;
}

/**
 * O bipe da letra de número `contadas` (contando só as letras que soam, a partir de 1), ou null se essa letra não
 * toca. `sorteio` (0 a 1) escolhe a variação de altura; nos testes é fixo.
 */
export function bipDaLetra(voz: Voz, letra: string, contadas: number, sorteio: number): Bip | null {
  if (!letraQueSoa(letra) || contadas < 1 || (contadas - 1) % voz.cadaLetras !== 0) return null;
  const semitons = (sorteio * 2 - 1) * voz.variacao;
  const frequencia = voz.frequencia * Math.pow(2, semitons / 12);
  return { frequencia, frequenciaFinal: frequencia * Math.pow(2, voz.deslize / 12), duracaoMs: voz.duracaoMs };
}

/** Pausa extra depois de pontuação, para a fala ter ritmo: vírgula curta, ponto longo. */
export function pausaDepois(letra: string): number {
  if (/[.!?…]/.test(letra)) return 220;
  if (/[,;:—–]/.test(letra)) return 110;
  return 0;
}
