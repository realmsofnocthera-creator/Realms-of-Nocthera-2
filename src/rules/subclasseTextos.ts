/**
 * Textos das subclasses para a Tela de Subclasse (2.1.5): tema e, para cada espaço do kit,
 * o id da habilidade (o mesmo do registro), o nome e o que ela faz. Os números moram em subclasseKits.ts.
 */
export interface TextoHabilidadeSubclasse {
  id: string;
  nome: string;
  descricao: string;
}

export interface TextoSubclasse {
  tema: string;
  passiva: TextoHabilidadeSubclasse;
  basico: TextoHabilidadeSubclasse;
  especial: TextoHabilidadeSubclasse;
  ultimate: TextoHabilidadeSubclasse;
}

export const TEXTOS_SUBCLASSE: Readonly<Record<string, TextoSubclasse>> = {
  berserker: {
    tema: 'Bárbaro de fúria e sangue: fica mais forte quanto mais ferido.',
    passiva: { id: 'berserker_frenesi', nome: 'Frenesi', descricao: '+1% de dano físico a cada 5% de HP perdido, até +20%.' },
    basico: { id: 'berserker_golpe_desenfreado', nome: 'Golpe Desenfreado', descricao: '115% de dano, e cada golpe soma mais dano ao seguinte.' },
    especial: { id: 'berserker_investida_sangrenta', nome: 'Investida Sangrenta', descricao: '170% de dano (210% com HP abaixo de 50%), ignora parte da defesa e causa Sangramento.' },
    ultimate: { id: 'berserker_desvario_final', nome: 'Desvario Final', descricao: '350% de dano, ignora defesa, dano extra contra escudo e Ímpeto Imprudente (mais dano, menos defesa).' },
  },
  colosso: {
    tema: 'Bárbaro-tanque de pele de pedra: resiste, se cura e esmaga.',
    passiva: { id: 'colosso_casca_de_pedra', nome: 'Casca de Pedra', descricao: '−8% de dano físico recebido e +5% de Sobreescudo.' },
    basico: { id: 'colosso_golpe_esmagador', nome: 'Golpe Esmagador', descricao: '105% de dano, cura 5% do dano causado e dá resistência física.' },
    especial: { id: 'colosso_impacto_sismico', nome: 'Impacto Sísmico', descricao: '160% de dano, cura 10% do HP e cria um Escudo Temporário.' },
    ultimate: { id: 'colosso_furia_do_colosso', nome: 'Fúria do Colosso', descricao: '320% de dano, dano extra contra escudo, cura, escudo e resistência.' },
  },
  vanguarda: {
    tema: 'Cavaleiro ofensivo, na linha de frente, com estandarte e marcas no alvo.',
    passiva: { id: 'vanguarda_linha_de_frente', nome: 'Linha de Frente', descricao: '+5% de dano físico e −5% de dano físico recebido.' },
    basico: { id: 'vanguarda_estocada_da_vanguarda', nome: 'Estocada da Vanguarda', descricao: '110% de dano e coloca uma Marca no alvo.' },
    especial: { id: 'vanguarda_carga_esmagadora', nome: 'Carga Esmagadora', descricao: '165% de dano, ignora defesa, enfraquece o inimigo e coloca Marca.' },
    ultimate: { id: 'vanguarda_estandarte_de_guerra', nome: 'Estandarte de Guerra', descricao: '330% de dano, ignora defesa, dano extra contra escudo, +4 de Força por 3 rodadas.' },
  },
  bastiao: {
    tema: 'Cavaleiro defensivo: escudo, resistência e juramento.',
    passiva: { id: 'bastiao_fortaleza_viva', nome: 'Fortaleza Viva', descricao: '+10% de Sobreescudo máximo e −5% de dano físico recebido.' },
    basico: { id: 'bastiao_golpe_de_escudo', nome: 'Golpe de Escudo', descricao: '95% de dano e resistência física curta.' },
    especial: { id: 'bastiao_muralha_inabalavel', nome: 'Muralha Inabalável', descricao: '120% de dano, Escudo Temporário e resistência física e mágica.' },
    ultimate: { id: 'bastiao_ultimo_juramento', nome: 'Último Juramento', descricao: '260% de dano, 1 rodada de imortalidade, redireciona 25% do dano e dá escudo.' },
  },
  kensei: {
    tema: 'Samurai de golpe único e preciso.',
    passiva: { id: 'kensei_lamina_perfeita', nome: 'Lâmina Perfeita', descricao: '+5% de dano físico.' },
    basico: { id: 'kensei_corte_perfeito', nome: 'Corte Perfeito', descricao: '110% de dano, ignora 10% da defesa.' },
    especial: { id: 'kensei_lamina_desembainhada', nome: 'Lâmina Desembainhada', descricao: '175% de dano, ignora defesa e dá Foco ao próximo ataque.' },
    ultimate: { id: 'kensei_corte_decisivo', nome: 'Corte Decisivo', descricao: '340% de dano, ignora defesa e +20% contra alvo abaixo de 30% de HP.' },
  },
  ronin: {
    tema: 'Samurai errante de golpes rápidos e vento.',
    passiva: { id: 'ronin_passo_livre', nome: 'Passo Livre', descricao: '+5% de dano físico e −5% de dano físico recebido.' },
    basico: { id: 'ronin_corte_relampago', nome: 'Corte Relâmpago', descricao: '2 golpes de 55% (110% no total).' },
    especial: { id: 'ronin_danca_da_lamina_solitaria', nome: 'Dança da Lâmina Solitária', descricao: '3 golpes de 55% (165%) e Exaustão no inimigo.' },
    ultimate: { id: 'ronin_quatro_ventos', nome: 'Quatro Ventos', descricao: '4 golpes de 85% (340%), +4 de Agilidade e chance de Sincronismo.' },
  },
  assassino: {
    tema: 'Bandido de golpe preciso, sangramento e ponto fraco.',
    passiva: { id: 'assassino_instinto_letal', nome: 'Instinto Letal', descricao: '+6% de dano físico.' },
    basico: { id: 'assassino_estocada_furtiva', nome: 'Estocada Furtiva', descricao: '100% de dano e deixa o alvo com Ponto Fraco.' },
    especial: { id: 'assassino_golpe_nas_sombras', nome: 'Golpe nas Sombras', descricao: '2 golpes de 80% (160%) e chance de Sangramento.' },
    ultimate: { id: 'assassino_execucao_silenciosa', nome: 'Execução Silenciosa', descricao: '340% de dano, ignora 20% da defesa e chance alta de Sangramento.' },
  },
  duelista: {
    tema: 'Bandido de velocidade e controle: estocadas e fintas.',
    passiva: { id: 'duelista_postura_de_duelo', nome: 'Postura de Duelo', descricao: '+3% de dano físico e −6% de dano físico recebido.' },
    basico: { id: 'duelista_estocada_dupla', nome: 'Estocada Dupla', descricao: '2 golpes de 55% (110% no total).' },
    especial: { id: 'duelista_finta', nome: 'Finta', descricao: '3 golpes de 55% (165%) e o inimigo perde a próxima ação (Distração).' },
    ultimate: { id: 'duelista_duelo_final', nome: 'Duelo Final', descricao: '5 golpes de 68% (340%) e Sincronismo garantido.' },
  },
  sacerdote: {
    tema: 'Profeta de cura e sustentação.',
    passiva: { id: 'sacerdote_aura_sagrada', nome: 'Aura Sagrada', descricao: '−5% de dano mágico recebido e +10% de eficácia de cura.' },
    basico: { id: 'sacerdote_toque_sagrado', nome: 'Toque Sagrado', descricao: '100% de dano sagrado e cura 3% do HP.' },
    especial: { id: 'sacerdote_prece_de_cura', nome: 'Prece de Cura', descricao: '85% de dano sagrado, remove 1 efeito negativo e cura 10%.' },
    ultimate: { id: 'sacerdote_graca_redentora', nome: 'Graça Redentora', descricao: '200% de dano sagrado, limpeza, cura contínua e volta à vida uma vez por luta.' },
  },
  inquisidor: {
    tema: 'Profeta de punição e fogo sagrado.',
    passiva: { id: 'inquisidor_olhar_julgador', nome: 'Olhar Julgador', descricao: '+6% de dano mágico e +5% a mais contra alvo com status negativo.' },
    basico: { id: 'inquisidor_sentenca', nome: 'Sentença', descricao: '115% de dano sagrado, com dano extra contra o elemento Sombrio.' },
    especial: { id: 'inquisidor_fogo_sagrado', nome: 'Fogo Sagrado', descricao: '165% de dano, chance de Queimadura e Enfraquecimento.' },
    ultimate: { id: 'inquisidor_julgamento_final', nome: 'Julgamento Final', descricao: '330% de dano sagrado, ignora defesa, dano extra contra Sombrio e cura pelo dano causado.' },
  },
  arquimago: {
    tema: 'Feiticeiro de dano puro: fogo e raio.',
    passiva: { id: 'arquimago_poder_arcano', nome: 'Poder Arcano', descricao: '+8% de dano mágico.' },
    basico: { id: 'arquimago_bola_de_fogo', nome: 'Bola de Fogo', descricao: '115% de dano de Fogo.' },
    especial: { id: 'arquimago_tempestade_de_raios', nome: 'Tempestade de Raios', descricao: '3 golpes de 60% (180%) de Relâmpago e chance de Paralisia.' },
    ultimate: { id: 'arquimago_meteoro', nome: 'Meteoro', descricao: '360% de dano de Fogo, ignora defesa, dano extra contra escudo e Queimadura garantida.' },
  },
  sabio_arcano: {
    tema: 'Feiticeiro de controle: gelo, sono e loucura.',
    passiva: { id: 'sabio_arcano_sabedoria_arcana', nome: 'Sabedoria Arcana', descricao: '+4% de dano mágico e −5% de dano mágico recebido.' },
    basico: { id: 'sabio_arcano_lanca_de_gelo', nome: 'Lança de Gelo', descricao: '105% de dano de Gelo e chance de Congelamento.' },
    especial: { id: 'sabio_arcano_feitico_do_torpor', nome: 'Feitiço do Torpor', descricao: '160% de dano mágico e chance de Sono.' },
    ultimate: { id: 'sabio_arcano_eclipse_da_mente', nome: 'Eclipse da Mente', descricao: '330% de dano mágico, ignora parte da defesa, dano extra contra alvo sob status e chance de Loucura.' },
  },
};
