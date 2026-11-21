/** Os textos da tela de luta (HUD sobre o mapa), em código para a futura tradução. Os modelos usam {chave}. */
export const TEXTOS_DO_COMBATE = {
  turno: 'Turno {n}',
  velocidadeDobrada: 'Velocidade dobrada',
  velocidadeNormal: 'Velocidade normal',
  pularParaOFim: 'Pular para o fim',
  hp: 'HP',
  vida: 'Vida {hp} de {max}',
  escudo: 'Sobreescudo {n} de {max}',
  nivel: 'Nível {n}',
  inimigo: '{nome}, nível {n}',
  danoCausado: 'Dano causado',
  danoCausadoAria: 'Dano causado ao chefe: {n}',
  melhorDeHoje: 'Melhor de hoje: {n}',
  enfurecido: 'Enfurecido',
  habilidade: '{nome}: {texto}',
  ticksAria: 'Faltam {n} ataques',
  dano: 'menos {n} de vida',
  cura: 'mais {n} de vida',
} as const;

/** Os textos das telas de vitória e de derrota (o resto da arte já vem escrito no vídeo do Yuri). */
export const TEXTOS_DO_FIM_DA_LUTA = {
  vitoria: 'Vitória! A batalha foi vencida.',
  derrota: 'Derrota. Os heróis caíram.',
  xp: '+{n} XP',
  subiuNivel: '+{n} XP · Nível {nivel}!',
  ouro: '+{n}',
  ouroPerdido: '{n}',
  ouroAria: 'Ouro {n}',
  xpAria: 'XP ganho: {n}',
  espolio: '{nome} ×{qtd}',
  semEspolio: 'Sem espólio',
  continuar: 'Continuar',
} as const;

/** Os avisos que aparecem sobre quem apanhou (e o nome das habilidades vem das regras). */
export const TEXTOS_DO_IMPACTO = {
  critico: 'CRÍTICO!',
  fraqueza: 'FRAQUEZA!',
  resistencia: 'RESISTIU',
  imune: 'IMUNE',
  bloqueado: 'BLOQUEADO',
  habilidade: '{nome}!',
  danoAria: 'Dano {n}',
  danoCriticoAria: 'Dano crítico {n}',
  curaAria: 'Cura {n}',
} as const;

/** Os textos da cena da ultimate. */
export const TEXTOS_DA_ULTIMATE = {
  aria: 'Ultimate',
  pular: 'Toque para pular',
} as const;
