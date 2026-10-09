/**
 * Constantes numéricas e configurações dos kits de habilidades de subclasse.
 * Todas as unidades e percentuais estão explicitados em comentários.
 */

export const BERSERKER_KIT = {
  // Golpe Desenfreado (ataqueBasico)
  GOLPE_DESENFREADO: {
    PERCENTUAL_DANO: 115, // % do danoBase (físico)
  },
  // Investida Sangrenta (habilidadeEspecial)
  INVESTIDA_SANGRENTA: {
    PERCENTUAL_DANO_NORMAL: 170, // % do danoBase se HP >= 50%
    PERCENTUAL_DANO_ABAIXO_50_HP: 210, // % do danoBase se HP < 50% do HP máximo
    IGNORAR_DEFESA_PERCENTUAL: 10, // % da Defesa Física / Mitigação ignorada (0 a 100)
    LIMIAR_HP_CONDICIONAL_PERCENTUAL: 50, // % do HP máximo para ativação do dano ampliado
  },
  // Desvario Final (ultimate)
  DESVARIO_FINAL: {
    PERCENTUAL_DANO: 350, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 20, // % da Defesa Física / Mitigação ignorada (0 a 100)
    BONUS_CONTRA_SOBREESCUDO_PERCENTUAL: 25, // % de dano adicional se o alvo tiver Sobreescudo > 0
    BONUS_DANO_ABAIXO_30_HP_PERCENTUAL: 30, // % bônus condicional somado se HP < 30% do HP máximo
    LIMIAR_HP_CONDICIONAL_PERCENTUAL: 30, // % do HP máximo para ativação do bônus condicional
  },
} as const;

export const COLOSSO_KIT = {
  // Golpe Esmagador (ataqueBasico)
  GOLPE_ESMAGADOR: {
    PERCENTUAL_DANO: 105, // % do danoBase (físico)
    CURA_PERCENTUAL_DANO_CAUSADO: 5, // % do danoEfetivo curado no HP do atacante
  },
  // Impacto Sísmico (habilidadeEspecial)
  IMPACTO_SISMICO: {
    PERCENTUAL_DANO: 160, // % do danoBase (físico)
    CURA_PERCENTUAL_HP_MAX: 10, // % do HP máximo do atacante curado
  },
  // Fúria do Colosso (ultimate)
  FURIA_DO_COLOSSO: {
    PERCENTUAL_DANO: 320, // % do danoBase (físico)
    BONUS_CONTRA_SOBREESCUDO_PERCENTUAL: 25, // % de dano adicional se o alvo tiver Sobreescudo > 0
    CURA_PERCENTUAL_HP_MAX: 15, // % do HP máximo do atacante curado
  },
} as const;

export const VANGUARDA_KIT = {
  // Estocada da Vanguarda (ataqueBasico): coloca 1 Marca; +3% de dano por Marca já no alvo
  ESTOCADA_DA_VANGUARDA: {
    PERCENTUAL_DANO: 110, // % do danoBase (físico)
  },
  // Carga Esmagadora (habilidadeEspecial)
  CARGA_ESMAGADORA: {
    PERCENTUAL_DANO: 165, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 15, // % da Defesa Física / Mitigação ignorada
    ENFRAQUECIMENTO_PERCENTUAL: 20, // −% do dano que o alvo causa
    ENFRAQUECIMENTO_RODADAS: 2, // ações do alvo
  },
  // Estandarte de Guerra (ultimate)
  ESTANDARTE_DE_GUERRA: {
    PERCENTUAL_DANO: 330, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 20, // % da Defesa Física / Mitigação ignorada
    BONUS_CONTRA_SOBREESCUDO_PERCENTUAL: 25, // % de dano adicional se o alvo tiver Sobreescudo > 0
    BONUS_FORCA: 4, // +Força em quem usa
    BONUS_FORCA_RODADAS: 3, // rodadas do bônus de Força
  },
} as const;

/**
 * Constantes das passivas de subclasse.
 */
export const PASSIVAS_SUBCLASSE = {
  // Passiva do Berserker: Frenesi
  FRENESI: {
    PONTOS_PERCENTUAIS_POR_BONUS: 5, // A cada 5% de HP perdido, +1% de dano físico
    TETO_BONUS_DANO_PERCENTUAL: 20, // Teto máximo de +20% de bônus de dano físico
  },
  // Passiva da Vanguarda: Linha de Frente
  LINHA_DE_FRENTE: {
    BONUS_DANO_FISICO_PERCENTUAL: 5, // +5% de dano físico, sempre
    REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL: 5, // −5% de dano físico recebido, sempre
  },
  // Passiva do Colosso: Casca de Pedra
  CASCA_DE_PEDRA: {
    REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL: 8, // 8% de redução percentual do dano físico recebido
    BONUS_SOBREESCUDO_MAX_PERCENTUAL: 5, // +5% de Sobreescudo máximo; soma com o da classe em calcularSobreescudoMax (48E)
  },
} as const;

/**
 * Tier mínimo exigido para desbloqueio da passiva da subclasse.
 */
export const TIER_PASSIVA_SUBCLASSE = 1;

/**
 * Mapeamento entre o ID da subclasse e o ID da respectiva passiva registrada.
 */
export const PASSIVA_POR_SUBCLASSE: Record<string, string> = {
  berserker: 'berserker_frenesi',
  colosso: 'colosso_casca_de_pedra',
  vanguarda: 'vanguarda_linha_de_frente',
};

