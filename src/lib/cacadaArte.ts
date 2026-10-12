/**
 * Artes da tela de combate da Caçada. O que ainda não tem arte cai num substituto (retrato do personagem,
 * silhueta do monstro, fundo genérico), então dá para ir adicionando artes aos poucos.
 */

export interface SpriteLuta {
  src: string;
  /** largura / altura da imagem, para dimensionar sem esperar o carregamento */
  proporcao: number;
}

/** Personagem de corpo inteiro, virado para a direita (por classe). */
export const SPRITE_CLASSE: Readonly<Record<string, SpriteLuta>> = {
  barbaro: { src: '/images/cacada/barbaro.webp', proporcao: 634 / 520 },
};

/** Monstro de corpo inteiro, virado para a esquerda (por id do monstro). */
export const SPRITE_MONSTRO: Readonly<Record<string, SpriteLuta>> = {
  'rato-da-floresta': { src: '/images/cacada/rato-da-floresta.webp', proporcao: 514 / 360 },
};

/** Cenário de cada estrela, com a plataforma do monstro em cima à direita e a do jogador embaixo. */
export const CENARIO_ESTRELA: Readonly<Record<number, string>> = {
  1: '/images/cacada/cenario-1.webp',
};

/** Tamanho do monstro na cena (% da altura da arena): o Rato é pequeno; os demais, por enquanto, a silhueta. */
export const ALTURA_MONSTRO_PADRAO = 22;
