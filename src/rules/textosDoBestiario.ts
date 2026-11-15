/**
 * Os textos da tela do Bestiário (o livro vermelho, em pixel), todos em código para a futura tradução. Os modelos usam
 * {chave} e são preenchidos com `textoDaFicha(modelo, valores)`. Os textos que as duas telas dividem (ícones, páginas)
 * ficam em `textosDaCacada.ts`.
 */
export const TEXTOS_DO_BESTIARIO = {
  titulo: 'Bestiário',
  voltar: 'Voltar ao Menu',
  livro: 'Bestiário: as criaturas por categoria à esquerda e a ficha da criatura escolhida à direita',
  categorias: 'Categorias de monstros',
  irParaCategoria: 'Ir para {nome}',
  nivelDoBestiario: 'Bestiário {n}/{max}',
  nivelDoBestiarioAria: 'Nível {n} de {max} no Bestiário',
  progresso: '{nome}: {atual}/{proximo} vitórias para o próximo nível',
  completo: '{nome}: ficha completa',
  semDerrotas: '{nome}: ainda não derrotada',
  abaDoNivel: 'Nível {n}/{max}',
} as const;
