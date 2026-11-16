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
 * Os RETRATOS: as criaturas de corpo inteiro (pixel art do Yuri, de frente, fundo transparente e já cortadas rente à arte),
 * uma por id de monstro. Aparecem na página da direita (ficha da criatura) e na luta. Cada tamanho abaixo é [largura, altura] em pixels da arte. O tamanho de cada uma já carrega a escala da estrela (as de 5★ a 9★ são
 * mais altas), então na luta a altura na tela segue a altura da arte. Sempre com `image-rendering: pixelated`.
 */
const TAMANHO_DA_ARTE: Readonly<Record<string, readonly [number, number]>> = {
  'abysskar': [114, 102],
  'abysskar-abissal': [159, 102],
  'cryovarn': [87, 75],
  'cryovarn-abissal': [108, 105],
  'cryovarn-furioso': [114, 92],
  'dravakhar': [237, 134],
  'dravoryx': [166, 110],
  'dravoryx-tempestuoso': [205, 110],
  'drazhkar': [83, 102],
  'drazhkar-de-obsidiana': [80, 114],
  'drazhkar-sismico': [80, 105],
  'dromvark': [149, 118],
  'dromvark-devastador': [141, 118],
  'esqueleto': [86, 101],
  'esqueleto-amaldicoado': [83, 104],
  'esqueleto-flamejante': [88, 87],
  'floragoth': [110, 102],
  'floragoth-abissal': [97, 100],
  'floragoth-carmesim': [99, 90],
  'ghorvazul': [176, 126],
  'gravorn': [180, 110],
  'gravorn-magmatico': [184, 110],
  'grizzharn': [95, 92],
  'grizzharn-ancestral': [105, 106],
  'grizzharn-glacial': [123, 101],
  'kharvok': [97, 118],
  'kharvok-de-obsidiana': [113, 118],
  'lobo-carmesim': [120, 83],
  'lobo-cinzento': [111, 83],
  'lobo-gelido': [122, 79],
  'matriarca-putrefata': [156, 102],
  'murdrax': [129, 74],
  'murdrax-corrosivo': [147, 92],
  'murdrax-de-basalto': [90, 98],
  'nershaga': [128, 126],
  'noctyrr': [123, 89],
  'noctyrr-abissal': [133, 82],
  'noctyrr-tempestuoso': [122, 92],
  'nythrakka': [119, 97],
  'nythrakka-fantasma': [80, 69],
  'nythrakka-matriarca-do-casulo': [149, 102],
  'nythrakka-venenosa': [99, 95],
  'oryndrak': [188, 134],
  'pesthyr': [139, 86],
  'pesthyr-carmesim': [122, 89],
  'pesthyr-glacial': [122, 85],
  'raizark': [189, 110],
  'raizark-fulminante': [179, 110],
  'rathmorn': [241, 118],
  'rathmorn-abissal': [240, 118],
  'rato-da-floresta': [81, 66],
  'rato-das-cinzas': [76, 84],
  'rato-pestilento': [88, 65],
  'reydras': [234, 134],
  'rhazkida': [85, 80],
  'rhazkida-cristalina': [103, 103],
  'rhazkida-escarlate': [104, 98],
  'thalassyr': [161, 110],
  'thalassyr-abissal': [177, 110],
  'tharvok': [150, 126],
  'urdumor': [234, 134],
  'urso-colerico': [120, 89],
  'urso-gigante': [120, 86],
  'urso-glacial': [114, 84],
  'vaelgrun': [224, 126],
  'vargheist': [122, 92],
  'vargheist-albino': [143, 85],
  'vargheist-alfa': [111, 89],
  'vargheist-alfa-carmesim': [134, 91],
  'vargheist-alfa-vulcanico': [131, 81],
  'vargheist-vulcanico': [123, 92],
  'vorthak': [171, 102],
  'vorthak-carmesim': [124, 102],
  'zaryth': [120, 79],
  'zaryth-abissal': [117, 82],
  'zaryth-vulcanico': [115, 81],
  'zyrak': [274, 118],
  'zyrak-carmesim': [242, 118],
};

/** A altura de arte (px) que vale a altura padrão do monstro na cena da luta. */
export const ALTURA_DE_REFERENCIA_DA_ARTE = 118;

/**
 * Os ÍCONES: o quadro quadrado de cada criatura (pixel art do Yuri). Ficam na página da esquerda da Caçada e como base do
 * Bestiário. São outra arte, diferente do retrato.
 */
export const ICONE_MONSTRO: Readonly<Record<string, string>> = Object.fromEntries(Object.keys(TAMANHO_DA_ARTE).map((id) => [id, `/images/cacada/criaturas/${id}.webp`]));

export interface SpriteDaCriatura extends SpriteLuta {
  /** a altura da arte, em pixels */
  altura: number;
}

export const SPRITE_MONSTRO: Readonly<Record<string, SpriteDaCriatura>> = Object.fromEntries(
  Object.entries(TAMANHO_DA_ARTE).map(([id, [l, a]]) => [id, { src: `/images/cacada/retratos/${id}.webp`, proporcao: l / a, altura: a }])
);

/** Cenário de cada estrela, com a plataforma do monstro em cima à direita e a do jogador embaixo. */
export const CENARIO_ESTRELA: Readonly<Record<number, string>> = {
  1: '/images/cacada/cenario-1.webp',
};

/** Tamanho do monstro sem arte na cena (% da altura da arena): a silhueta. */
export const ALTURA_MONSTRO_PADRAO = 22;
