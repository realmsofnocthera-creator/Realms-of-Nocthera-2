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

/**
 * As criaturas de corpo inteiro (pixel art do Yuri, de frente, fundo transparente), uma por id de monstro, todas em quadro
 * quadrado. Aparecem na luta, na lista da Caçada e no Bestiário (sempre com `image-rendering: pixelated`).
 */
const IDS_COM_ARTE = [
  'abysskar',
  'abysskar-abissal',
  'cryovarn',
  'cryovarn-abissal',
  'cryovarn-furioso',
  'dravakhar',
  'dravoryx',
  'dravoryx-tempestuoso',
  'drazhkar',
  'drazhkar-de-obsidiana',
  'drazhkar-sismico',
  'dromvark',
  'dromvark-devastador',
  'esqueleto',
  'esqueleto-amaldicoado',
  'esqueleto-flamejante',
  'floragoth',
  'floragoth-abissal',
  'floragoth-carmesim',
  'ghorvazul',
  'gravorn',
  'gravorn-magmatico',
  'grizzharn',
  'grizzharn-ancestral',
  'grizzharn-glacial',
  'kharvok',
  'kharvok-de-obsidiana',
  'lobo-carmesim',
  'lobo-cinzento',
  'lobo-gelido',
  'matriarca-putrefata',
  'murdrax',
  'murdrax-corrosivo',
  'murdrax-de-basalto',
  'nershaga',
  'noctyrr',
  'noctyrr-abissal',
  'noctyrr-tempestuoso',
  'nythrakka',
  'nythrakka-fantasma',
  'nythrakka-matriarca-do-casulo',
  'nythrakka-venenosa',
  'oryndrak',
  'pesthyr',
  'pesthyr-carmesim',
  'pesthyr-glacial',
  'raizark',
  'raizark-fulminante',
  'rathmorn',
  'rathmorn-abissal',
  'rato-da-floresta',
  'rato-das-cinzas',
  'rato-pestilento',
  'reydras',
  'rhazkida',
  'rhazkida-cristalina',
  'rhazkida-escarlate',
  'thalassyr',
  'thalassyr-abissal',
  'tharvok',
  'urdumor',
  'urso-colerico',
  'urso-gigante',
  'urso-glacial',
  'vaelgrun',
  'vargheist',
  'vargheist-albino',
  'vargheist-alfa',
  'vargheist-alfa-carmesim',
  'vargheist-alfa-vulcanico',
  'vargheist-vulcanico',
  'vorthak',
  'vorthak-carmesim',
  'zaryth',
  'zaryth-abissal',
  'zaryth-vulcanico',
  'zyrak',
  'zyrak-carmesim',
] as const;

export const SPRITE_MONSTRO: Readonly<Record<string, SpriteLuta>> = Object.fromEntries(
  IDS_COM_ARTE.map((id) => [id, { src: `/images/cacada/criaturas/${id}.webp`, proporcao: 1 }])
);

/** Cenário de cada estrela, com a plataforma do monstro em cima à direita e a do jogador embaixo. */
export const CENARIO_ESTRELA: Readonly<Record<number, string>> = {
  1: '/images/cacada/cenario-1.webp',
};

/** Tamanho do monstro sem arte na cena (% da altura da arena): a silhueta. */
export const ALTURA_MONSTRO_PADRAO = 22;
