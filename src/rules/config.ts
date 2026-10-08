import { Attributes } from './attributes';

export const GAME_CONFIG = {
  NIVEL_MAXIMO_GRAU_1: 30,
  PONTOS_INICIAIS: 10,
  PONTOS_POR_NIVEL: 3,
  VALOR_BASE_ATRIBUTOS: {
    vigor: 2,
    sorte: 2,
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
  // Sorte: crítico (dobra o dano depois da defesa) e chance de drop
  CHANCE_CRITICO_BASE_PERCENTUAL: 2,
  CHANCE_CRITICO_POR_PONTO_SORTE: 0.1,
  MULTIPLICADOR_CRITICO: 2,
  CHANCE_DROP_POR_PONTO_SORTE: 0.1,
  // Contrapeso (catálogo 1.2): redução de dano recebido com HP cheio, caindo em linha reta até 0% com HP zerado
  CONTRAPESO_REDUCAO_MAXIMA_PERCENTUAL: 15,
  // Habilidades raciais ativas: sem custo, só recarga
  RECARGA_HABILIDADE_RACIAL_RODADAS: 8,
  // As habilidades raciais ativas disparam sozinhas quando o HP de quem as tem fica abaixo deste valor (% do máximo)
  LIMITE_HP_RACIAL_PERCENTUAL: 50,
  SOBREESCUDO_POR_PONTO_VITALIDADE: 2,
  CUSTO_RESET_ATRIBUTOS_DIAMANTES: 100,
  SUBCLASSE_NIVEL_MINIMO: 20,
  SUBCLASSE_CUSTO_OURO: 10000,
  SUBCLASSE_CUSTO_FRAGMENTOS_ALMA: 5,
  SUBCLASSE_CUSTO_TROCA_DIAMANTES: 100,
  SUBCLASSE_BONUS_TOTAL_PONTOS: 40,
  SUBCLASSE_TIER_MAX: 4,
} as const;
