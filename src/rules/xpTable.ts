/**
 * XP EXIGIDO por nível (do nível N para o N+1). É a única tabela que diz quanto falta para subir: HUD, ficha, guildas
 * (fração do nível) e o loop de subida do personagem leem daqui, via xpParaProximoNivel.
 * NÃO é a fonte do XP dos monstros da Caçada: isso é XP_BASE_DA_CACADA (abaixo).
 */
export const XP_TABLE: Readonly<Record<number, number>> = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100,
  6: 120,
  7: 140,
  8: 160,
  9: 180,
  10: 200,
  11: 300,
  12: 400,
  13: 500,
  14: 600,
  15: 700,
  16: 800,
  17: 900,
  18: 1000,
  19: 1100,
  20: 1200,
  21: 1400,
  22: 1600,
  23: 1800,
  24: 2000,
  25: 2200,
  26: 2600,
  27: 3000,
  28: 3400,
  29: 3800,
  30: 4200,
} as const;

/**
 * Base do XP dos monstros da Caçada (Ordem 1, Desenvolvimento): a tabela ANTIGA, guardada à parte para o XP por luta não
 * mudar quando a XP_TABLE do nível mudar. A Caçada paga 5% do valor da estrela (no nível mínimo dela) por luta.
 * Só o Balanceamento muda estes valores; a XP_TABLE pode mudar sem mexer aqui.
 */
export const XP_BASE_DA_CACADA: Readonly<Record<number, number>> = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100,
  6: 120,
  7: 140,
  8: 160,
  9: 180,
  10: 200,
  11: 300,
  12: 400,
  13: 500,
  14: 600,
  15: 700,
  16: 800,
  17: 900,
  18: 1000,
  19: 1100,
  20: 1200,
  21: 1400,
  22: 1600,
  23: 1800,
  24: 2000,
  25: 2200,
  26: 2600,
  27: 3000,
  28: 3400,
  29: 3800,
  30: 4200,
} as const;
