import { Attributes } from './attributes';

export const GAME_CONFIG = {
  NIVEL_MAXIMO_GRAU_1: 30,
  PONTOS_INICIAIS: 10,
  PONTOS_POR_NIVEL: 3,
  VALOR_BASE_ATRIBUTOS: {
    vigor: 2,
    mente: 2,
    forca: 0,
    vitalidade: 0,
    arcano: 0,
    inteligencia: 0,
    agilidade: 0,
  } as const satisfies Attributes,
  OURO_PERDIDO_MORTE: 50,
  DANO_MINIMO: 1,
  MAXIMO_ATAQUES_POR_TURNO: 2,
  // Regra 1.2.2: reduções de dano recebido somadas nunca passam deste teto (só Imortalidade Breve zera o dano)
  TETO_REDUCAO_DANO_PERCENTUAL: 80,
  HP_POR_PONTO_VIGOR: 5,
  MANA_POR_PONTO_MENTE: 5,
  SOBREESCUDO_POR_PONTO_VITALIDADE: 2,
  CUSTO_RESET_ATRIBUTOS_DIAMANTES: 100,
  SUBCLASSE_NIVEL_MINIMO: 20,
  SUBCLASSE_CUSTO_OURO: 10000,
  SUBCLASSE_CUSTO_FRAGMENTOS_ALMA: 5,
  SUBCLASSE_CUSTO_TROCA_DIAMANTES: 100,
  SUBCLASSE_BONUS_TOTAL_PONTOS: 40,
  SUBCLASSE_TIER_MAX: 4,
} as const;
