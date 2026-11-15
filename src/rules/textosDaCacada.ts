/**
 * Os textos da tela da Caçada (o livro vermelho, em pixel), todos em código para a futura tradução. Os modelos usam {chave}
 * e são preenchidos com `textoDaFicha(modelo, valores)`.
 */
export const TEXTOS_DA_CACADA = {
  titulo: 'Caçada',
  voltar: 'Voltar às Provações',
  livro: 'Livro da Caçada: os monstros à esquerda e o monstro escolhido à direita',
  jogador: '{nome} · Nv. {nivel}',
  /** As abas de cima (ranque) e as fitas da borda (estrelas). */
  abaBaixo: 'Rank Baixo',
  abaAlto: 'Rank Alto',
  abaAria: '{nome}, {faixa}',
  abaBloqueadaAria: '{nome}, {faixa}. Bloqueado: {requisito}',
  estrelaRotulo: '{n}★',
  estrelaAria: 'Dificuldade {n} estrelas',
  estrelaBloqueadaAria: 'Dificuldade {n} estrelas. Bloqueada: {requisito}',
  /** O que a página da esquerda mostra. */
  monstrosDaEstrela: 'Monstros {n}★',
  semMonstros: 'Nenhum monstro nesta dificuldade.',
  monstroNivel: 'Nv. {n}',
  monstroChave: 'Monstro-chave',
  escolher: 'Ver {nome}',
  /** A página da direita. */
  fraquezas: 'Fraquezas',
  resistencias: 'Resist.',
  drops: 'Drops',
  nenhuma: '—',
  fechar: 'Fechar',
  /** O que cada ícone conta quando é tocado. */
  infoFraqueza: 'Fraqueza: recebe {n}% a mais de dano de {nome}.',
  infoResistencia: 'Resistência: recebe {n}% a menos de dano de {nome}.',
  infoDrop: '{raridade} · {chance}',
  infoDropTitulo: 'Drop: {nome}',
  iconeAria: '{nome}: ver informações',
  fraquezasAria: 'Fraquezas',
  cacar: 'Caçar',
  cacando: 'Caçando...',
  semArte: 'Sem retrato ainda',
  /** Páginas e avisos. */
  paginaAnterior: 'Página anterior',
  paginaSeguinte: 'Próxima página',
  paginaDe: 'Página {n} de {total}',
  paginaCurta: '{n} / {total}',
  semConexao: 'Sessão expirada. Faça login de novo.',
  erroAoIniciar: 'Não foi possível iniciar a caçada.',
  requer: 'Requer {x}',
  /** O resultado, em janela. */
  resultado: 'Resultado da caçada',
  concluida: 'Caçada concluída!',
  derrotado: 'Você foi derrotado',
  xp: 'XP +{n}',
  xpDe: 'XP +{n} (de {base})',
  ouro: 'Ouro {n}',
  subiuNivel: 'Subiu para o nível {n}!',
  chaveVencida: 'Monstro-chave vencido',
  chaveVencidaProxima: 'Monstro-chave vencido: a {n}★ está liberada',
  materiais: 'Materiais obtidos',
  cacarDeNovo: 'Caçar de novo',
  voltarAoLivro: 'Voltar ao livro',
  verMochila: 'Ver a Mochila',
} as const;
