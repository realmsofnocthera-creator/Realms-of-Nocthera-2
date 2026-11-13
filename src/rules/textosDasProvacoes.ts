/**
 * Os textos da tela de Provações (em pixel), todos em código para a futura tradução. Os modelos usam {chave} e são
 * preenchidos com `textoDaFicha(modelo, valores)`.
 */
export const TEXTOS_DAS_PROVACOES = {
  titulo: 'Provações',
  voltar: 'Voltar ao Hub',
  lista: 'Lista de Provações, em ordem de nível',
  jogador: '{nome} · Nv. {nivel}',
  nivelCurto: 'Nv {n}',
  nivelAria: 'Nível {n}',
  entrar: 'Entrar na {nome}',
  /** O rótulo do cartão aberto e do bloqueado (o bloqueado já era lido assim pelos leitores de tela e pelos testes). */
  abertaAria: '{nome} - Nível {n}',
  bloqueadaAria: '{nome} - Requer Nível {n}',
  bloqueada: 'Provação bloqueada',
  abreNoNivel: 'Abre no nível {n}',
  proxima: 'Próxima',
  faltam: 'Faltam {n} níveis',
  falta: 'Falta 1 nível',
} as const;
