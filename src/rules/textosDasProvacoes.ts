/**
 * Os textos da tela de Provações (o livro, em pixel), todos em código para a futura tradução. Os modelos usam {chave}
 * e são preenchidos com `textoDaFicha(modelo, valores)`.
 */
export const TEXTOS_DAS_PROVACOES = {
  titulo: 'Provações',
  voltar: 'Voltar ao Hub',
  livro: 'Livro das Provações, em ordem de nível',
  jogador: '{nome} · Nv. {nivel}',
  nivelCurto: 'Nv {n}',
  nivelAria: 'Nível {n}',
  entrar: 'Entrar na {nome}',
  /** O rótulo da provação aberta e da bloqueada (o bloqueado já era lido assim pelos leitores de tela e pelos testes). */
  abertaAria: '{nome} - Nível {n}',
  bloqueadaAria: '{nome} - Requer Nível {n}',
  bloqueada: 'Provação bloqueada',
  abreNoNivel: 'Abre no nível {n}',
  proxima: 'Próxima',
  faltam: 'Faltam {n} níveis',
  falta: 'Falta 1 nível',
  /** Os botões do livro. */
  paginaAnterior: 'Página anterior',
  paginaSeguinte: 'Próxima página',
  paginaDe: 'Página {n} de {total}',
  paginaCurta: '{n} / {total}',
} as const;
