/**
 * Constantes numéricas e configurações dos kits de habilidades de subclasse.
 * Todas as unidades e percentuais estão explicitados em comentários.
 */

export const BERSERKER_KIT = {
  // Golpe Desenfreado (ataqueBasico)
  GOLPE_DESENFREADO: {
    PERCENTUAL_DANO: 115, // % do danoBase (físico)
    ACUMULATIVO_PERCENTUAL_POR_ATAQUE: 2, // Dano Acumulativo: +2% de dano a cada golpe
    ACUMULATIVO_LIMITE_PERCENTUAL: 10, // até +10%
  },
  // Investida Sangrenta (habilidadeEspecial)
  INVESTIDA_SANGRENTA: {
    PERCENTUAL_DANO_NORMAL: 170, // % do danoBase se HP >= 50%
    PERCENTUAL_DANO_ABAIXO_50_HP: 210, // % do danoBase se HP < 50% do HP máximo
    IGNORAR_DEFESA_PERCENTUAL: 10, // % da Defesa Física / Mitigação ignorada (0 a 100)
    LIMIAR_HP_CONDICIONAL_PERCENTUAL: 50, // % do HP máximo para ativação do dano ampliado
    SANGRAMENTO_CHANCE_EXTRA_PERCENTUAL: 17, // pontos somados à chance base do Sangramento (3%): 20% no total
  },
  // Desvario Final (ultimate)
  DESVARIO_FINAL: {
    PERCENTUAL_DANO: 350, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 20, // % da Defesa Física / Mitigação ignorada (0 a 100)
    BONUS_CONTRA_SOBREESCUDO_PERCENTUAL: 25, // % de dano adicional se o alvo tiver Sobreescudo > 0
    BONUS_DANO_ABAIXO_30_HP_PERCENTUAL: 30, // % bônus condicional somado se HP < 30% do HP máximo
    LIMIAR_HP_CONDICIONAL_PERCENTUAL: 30, // % do HP máximo para ativação do bônus condicional
    IMPETO_ATAQUES: 3, // Ímpeto Imprudente: nos próximos 3 ataques
    IMPETO_BONUS_DANO_PERCENTUAL: 25, // +25% de dano
    IMPETO_REDUCAO_DEFESA_PERCENTUAL: 20, // −20% de defesa
  },
} as const;

export const COLOSSO_KIT = {
  // Golpe Esmagador (ataqueBasico)
  GOLPE_ESMAGADOR: {
    PERCENTUAL_DANO: 105, // % do danoBase (físico)
    CURA_PERCENTUAL_DANO_CAUSADO: 5, // % do danoEfetivo curado no HP do atacante
    RESISTENCIA_FISICA_PERCENTUAL: 3, // −% de dano físico recebido
    RESISTENCIA_FISICA_RODADAS: 1, // renova a cada golpe
  },
  // Impacto Sísmico (habilidadeEspecial)
  IMPACTO_SISMICO: {
    PERCENTUAL_DANO: 160, // % do danoBase (físico)
    CURA_PERCENTUAL_HP_MAX: 10, // % do HP máximo do atacante curado
    ESCUDO_TEMPORARIO_PERCENTUAL: 10, // % do Sobreescudo máximo concedido
    ESCUDO_TEMPORARIO_RODADAS: 2,
  },
  // Fúria do Colosso (ultimate)
  FURIA_DO_COLOSSO: {
    PERCENTUAL_DANO: 320, // % do danoBase (físico)
    BONUS_CONTRA_SOBREESCUDO_PERCENTUAL: 25, // % de dano adicional se o alvo tiver Sobreescudo > 0
    CURA_PERCENTUAL_HP_MAX: 15, // % do HP máximo do atacante curado
    ESCUDO_TEMPORARIO_PERCENTUAL: 15, // % do Sobreescudo máximo concedido
    RESISTENCIA_FISICA_PERCENTUAL: 10, // −% de dano físico recebido
    RODADAS: 2, // duração do escudo e da resistência
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

export const BASTIAO_KIT = {
  // Golpe de Escudo (ataqueBasico)
  GOLPE_DE_ESCUDO: {
    PERCENTUAL_DANO: 95, // % do danoBase (físico)
    RESISTENCIA_FISICA_PERCENTUAL: 3, // −% de dano físico recebido
    RESISTENCIA_FISICA_RODADAS: 1, // renova a cada golpe
  },
  // Muralha Inabalável (habilidadeEspecial)
  MURALHA_INABALAVEL: {
    PERCENTUAL_DANO: 120, // % do danoBase (físico)
    ESCUDO_TEMPORARIO_PERCENTUAL: 15, // % do Sobreescudo máximo concedido
    RESISTENCIA_PERCENTUAL: 10, // −% de dano físico e mágico recebido
    RODADAS: 2,
  },
  // Último Juramento (ultimate)
  ULTIMO_JURAMENTO: {
    PERCENTUAL_DANO: 260, // % do danoBase (físico)
    IMORTALIDADE_RODADAS: 1, // rodadas sem receber dano
    REDIRECIONAMENTO_PERCENTUAL: 25, // % do dano recebido devolvido ao inimigo
    ESCUDO_TEMPORARIO_PERCENTUAL: 25, // % do Sobreescudo máximo concedido
    RODADAS: 2, // duração do Redirecionamento e do Escudo Temporário
  },
} as const;

export const KENSEI_KIT = {
  // Corte Perfeito (ataqueBasico)
  CORTE_PERFEITO: {
    PERCENTUAL_DANO: 110, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 10, // % da Defesa Física / Mitigação ignorada
  },
  // Lâmina Desembainhada (habilidadeEspecial)
  LAMINA_DESEMBAINHADA: {
    PERCENTUAL_DANO: 175, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 15, // % da Defesa Física / Mitigação ignorada
    FOCO_IGNORAR_DEFESA_PERCENTUAL: 30, // Foco: o próximo ataque ignora 30% da defesa
  },
  // Corte Decisivo (ultimate)
  CORTE_DECISIVO: {
    PERCENTUAL_DANO: 340, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 15, // % da Defesa Física / Mitigação ignorada
    BONUS_ALVO_ABAIXO_30_HP_PERCENTUAL: 20, // % de dano adicional se o alvo estiver abaixo do limiar de HP
    LIMIAR_HP_ALVO_PERCENTUAL: 30, // % do HP máximo do alvo
  },
} as const;

export const RONIN_KIT = {
  // Corte Relâmpago (ataqueBasico): Golpe Duplo
  CORTE_RELAMPAGO: {
    GOLPES: 2,
    PERCENTUAL_DANO_POR_GOLPE: 55, // % do danoBase por golpe (físico); 110% no total
  },
  // Dança da Lâmina Solitária (habilidadeEspecial): Dano Replicado
  DANCA_DA_LAMINA_SOLITARIA: {
    GOLPES: 3,
    PERCENTUAL_DANO_POR_GOLPE: 55, // % do danoBase por golpe (físico); 165% no total
    EXAUSTAO_PERCENTUAL: 30, // −% de Agilidade do alvo
    EXAUSTAO_RODADAS: 2,
  },
  // Quatro Ventos (ultimate)
  QUATRO_VENTOS: {
    GOLPES: 4,
    PERCENTUAL_DANO_POR_GOLPE: 85, // % do danoBase por golpe (físico); 340% no total
    BONUS_AGILIDADE: 4, // +Agilidade em quem usa
    BONUS_AGILIDADE_RODADAS: 3,
    SINCRONISMO_CHANCE_PERCENTUAL: 30, // chance de ativar o Sincronismo a cada uso
    SINCRONISMO_RODADAS: 3,
  },
} as const;

export const ASSASSINO_KIT = {
  // Estocada Furtiva (ataqueBasico)
  ESTOCADA_FURTIVA: {
    PERCENTUAL_DANO: 100, // % do danoBase (físico)
    PONTO_FRACO_PERCENTUAL: 15, // o próximo dano que o alvo receber causa +15%
  },
  // Golpe nas Sombras (habilidadeEspecial)
  GOLPE_NAS_SOMBRAS: {
    GOLPES: 2,
    PERCENTUAL_DANO_POR_GOLPE: 80, // % do danoBase por golpe (físico); 160% no total
    SANGRAMENTO_CHANCE_EXTRA_PERCENTUAL: 17, // pontos somados à chance base do Sangramento (3%): 20% no total
  },
  // Execução Silenciosa (ultimate)
  EXECUCAO_SILENCIOSA: {
    PERCENTUAL_DANO: 340, // % do danoBase (físico)
    IGNORAR_DEFESA_PERCENTUAL: 20, // % da Defesa Física / Mitigação ignorada
    SANGRAMENTO_CHANCE_EXTRA_PERCENTUAL: 22, // pontos somados à chance base do Sangramento (3%): 25% no total
  },
} as const;

export const DUELISTA_KIT = {
  // Estocada Dupla (ataqueBasico): Golpe Duplo
  ESTOCADA_DUPLA: {
    GOLPES: 2,
    PERCENTUAL_DANO_POR_GOLPE: 55, // % do danoBase por golpe (físico); 110% no total
  },
  // Finta (habilidadeEspecial): Dano Replicado + Distração
  FINTA: {
    GOLPES: 3,
    PERCENTUAL_DANO_POR_GOLPE: 55, // % do danoBase por golpe (físico); 165% no total
    DISTRACAO_ACOES: 1, // o inimigo perde a próxima ação
  },
  // Duelo Final (ultimate)
  DUELO_FINAL: {
    GOLPES: 5,
    PERCENTUAL_DANO_POR_GOLPE: 68, // % do danoBase por golpe (físico); 340% no total
    SINCRONISMO_RODADAS: 2, // Sincronismo garantido
  },
} as const;

export const SACERDOTE_KIT = {
  // Toque Sagrado (ataqueBasico): dano sagrado + Cura Direta
  TOQUE_SAGRADO: {
    PERCENTUAL_DANO: 100, // % do danoBase (mágico, sagrado)
    CURA_DIRETA_PERCENTUAL_HP_MAX: 3, // % do HP máximo
  },
  // Prece de Cura (habilidadeEspecial): dano sagrado + Limpeza + cura
  PRECE_DE_CURA: {
    PERCENTUAL_DANO: 85, // % do danoBase (mágico, sagrado)
    LIMPEZA_EFEITOS: 1, // remove 1 efeito negativo
    CURA_PERCENTUAL_HP_MAX: 10, // % do HP máximo
  },
  // Graça Redentora (ultimate): dano sagrado + Limpeza + Cura Contínua + Ressurreição Parcial
  GRACA_REDENTORA: {
    PERCENTUAL_DANO: 200, // % do danoBase (mágico, sagrado)
    LIMPEZA_EFEITOS: 3, // remove até 3 efeitos negativos
    CURA_CONTINUA_PERCENTUAL_HP_MAX: 5, // % do HP máximo por rodada
    CURA_CONTINUA_RODADAS: 3,
    RESSURREICAO_PERCENTUAL_HP_MAX: 30, // volta com 30% do HP se cair a 0 (uma vez por luta)
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
  // Passiva do Bastião: Fortaleza Viva
  FORTALEZA_VIVA: {
    BONUS_SOBREESCUDO_MAX_PERCENTUAL: 10, // +10% de Sobreescudo máximo
    REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL: 5, // −5% de dano físico recebido
  },
  // Passiva do Sacerdote: Aura Sagrada
  AURA_SAGRADA: {
    BONUS_EFICACIA_CURA_PERCENTUAL: 10, // +10% de eficácia de cura (soma com Fé Inabalável e Cicatrização)
    REDUCAO_DANO_MAGICO_RECEBIDO_PERCENTUAL: 5, // −5% de dano mágico recebido, sempre
  },
  // Passiva do Duelista: Postura de Duelo
  POSTURA_DE_DUELO: {
    BONUS_DANO_FISICO_PERCENTUAL: 3, // +3% de dano físico, sempre
    REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL: 6, // −6% de dano físico recebido, sempre
  },
  // Passiva do Assassino: Instinto Letal
  INSTINTO_LETAL: {
    BONUS_DANO_FISICO_PERCENTUAL: 6, // +6% de dano físico, sempre
  },
  // Passiva do Ronin: Passo Livre
  PASSO_LIVRE: {
    BONUS_DANO_FISICO_PERCENTUAL: 5, // +5% de dano físico, sempre
    REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL: 5, // −5% de dano físico recebido, sempre
  },
  // Passiva do Kensei: Lâmina Perfeita
  LAMINA_PERFEITA: {
    BONUS_DANO_FISICO_PERCENTUAL: 5, // +5% de dano físico, sempre
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
  bastiao: 'bastiao_fortaleza_viva',
  kensei: 'kensei_lamina_perfeita',
  ronin: 'ronin_passo_livre',
  assassino: 'assassino_instinto_letal',
  duelista: 'duelista_postura_de_duelo',
  sacerdote: 'sacerdote_aura_sagrada',
};

