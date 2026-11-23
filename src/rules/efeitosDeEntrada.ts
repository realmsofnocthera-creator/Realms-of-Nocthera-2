import { ITENS_COSMETICOS } from './lojaPaga';
import type { NomeDoEfeito } from '@/assets/efeitosPixelfx';

/**
 * Os efeitos de entrada em combate (os cosméticos "Efeito de entrada em combate" da Loja Premium). Servem para QUALQUER personagem: o efeito não
 * depende do sprite da classe, ele se centra no herói e cresce com a altura dele. Cada um junta uma folha de quadros do pixelfx (a mesma dos
 * efeitos de magia do jogo) com camadas feitas em CSS. Os nomes e as cores são provisórios (o Yuri dá os finais).
 */
export type CamadaDoEfeito = 'anel' | 'estilhacos' | 'raios' | 'flash' | 'vortice' | 'coluna' | 'brasas' | 'espiral' | 'folhas' | 'penas';

export interface EfeitoDeEntrada {
  /** O id do cosmético (`efeito-<raridade>-<tema>`). */
  id: string;
  tema: string;
  raridade: 'raro' | 'epico' | 'lendario';
  cor: string;
  claro: string;
  /** A folha de quadros do pixelfx que toca no centro. */
  fx: NomeDoEfeito;
  camadas: readonly CamadaDoEfeito[];
  /** Quanto tempo o efeito dura, em ms (depois some). */
  duracaoMs: number;
}

const VISUAL: Readonly<Record<string, { cor: string; claro: string; fx: NomeDoEfeito; camadas: readonly CamadaDoEfeito[] }>> = {
  Gelo: { cor: '#6CC6FF', claro: '#E2F5FF', fx: 'magia-gelo', camadas: ['anel', 'estilhacos'] },
  'Relâmpago': { cor: '#FFE24A', claro: '#FFFBD0', fx: 'golpe-relampago', camadas: ['flash', 'raios', 'anel'] },
  Sombrio: { cor: '#9A66FF', claro: '#E6D6FF', fx: 'magia-sombrio', camadas: ['vortice', 'anel'] },
  Sagrado: { cor: '#FFE9A0', claro: '#FFFFFF', fx: 'magia-sagrado', camadas: ['coluna', 'penas', 'anel'] },
  Fogo: { cor: '#FF7A2A', claro: '#FFD9A8', fx: 'magia-fogo', camadas: ['coluna', 'brasas', 'anel'] },
  Vento: { cor: '#6FE0CC', claro: '#E0FFF8', fx: 'magia-vento', camadas: ['espiral', 'folhas', 'anel'] },
};

/** Mais raro = dura um pouco mais. */
const DURACAO: Readonly<Record<'raro' | 'epico' | 'lendario', number>> = { raro: 2000, epico: 2400, lendario: 2800 };

export const EFEITOS_DE_ENTRADA: Readonly<Record<string, EfeitoDeEntrada>> = Object.fromEntries(
  ITENS_COSMETICOS.filter((i) => i.tipo === 'efeito').map((i): [string, EfeitoDeEntrada] => {
    const v = VISUAL[i.tema];
    const raridade = i.raridade as EfeitoDeEntrada['raridade'];
    return [i.id, { id: i.id, tema: i.tema, raridade, ...v, duracaoMs: DURACAO[raridade] }];
  })
);

export const efeitoDeEntrada = (id: unknown): EfeitoDeEntrada | undefined =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(EFEITOS_DE_ENTRADA, id) ? EFEITOS_DE_ENTRADA[id] : undefined;
