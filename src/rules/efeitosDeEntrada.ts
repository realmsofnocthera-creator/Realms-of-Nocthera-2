import { ITENS_COSMETICOS } from './lojaPaga';
import { ARTE_DOS_EFEITOS } from '@/assets/cosmeticosArte';

/**
 * Os efeitos de entrada em combate (os cosméticos "Efeito de entrada em combate" da Loja Premium), com a arte do Yuri. Servem para QUALQUER personagem:
 * a arte é simétrica (vale de frente, de costas e de lado) e se ancora nos pés do herói. Duas camadas: uma atrás do herói e outra na frente; o herói
 * só aparece a partir do quadro de revelação. Os nomes e as cores são provisórios (o Yuri dá os finais).
 */
export interface EfeitoDeEntrada {
  /** O id do cosmético (`efeito-<raridade>-<tema>`). */
  id: string;
  tema: string;
  raridade: 'raro' | 'epico' | 'lendario';
  /** Quanto dura a animação, em ms (toca uma vez). */
  duracaoMs: number;
  /** Quando o herói aparece, em ms desde o começo. */
  revelacaoMs: number;
}

export const EFEITOS_DE_ENTRADA: Readonly<Record<string, EfeitoDeEntrada>> = Object.fromEntries(
  ITENS_COSMETICOS.filter((i) => i.tipo === 'efeito').map((i): [string, EfeitoDeEntrada] => {
    const a = ARTE_DOS_EFEITOS[i.id];
    return [i.id, { id: i.id, tema: i.tema, raridade: i.raridade as EfeitoDeEntrada['raridade'], duracaoMs: Math.round((a.quadros / a.fps) * 1000), revelacaoMs: Math.round(((a.revelacao ?? 0) / a.fps) * 1000) }];
  })
);

export const efeitoDeEntrada = (id: unknown): EfeitoDeEntrada | undefined =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(EFEITOS_DE_ENTRADA, id) ? EFEITOS_DE_ENTRADA[id] : undefined;
