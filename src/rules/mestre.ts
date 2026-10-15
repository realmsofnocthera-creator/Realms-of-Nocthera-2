/**
 * Papéis do Painel do Mestre (3.5.1). Quem tem papel entra em /mestre; o que cada um pode fazer vem desta tabela.
 * Dono só existe pelo ambiente do servidor (variável MESTRE_DONO_UIDS), nunca por concessão no painel.
 */
export const PAPEIS_MESTRE = ['dono', 'mestre', 'moderador', 'suporte'] as const;
export type PapelMestre = (typeof PAPEIS_MESTRE)[number];

export const NOME_DO_PAPEL: Readonly<Record<PapelMestre, string>> = {
  dono: 'Dono',
  mestre: 'Mestre',
  moderador: 'Moderador',
  suporte: 'Suporte',
};

export const DESCRICAO_DO_PAPEL: Readonly<Record<PapelMestre, string>> = {
  dono: 'Tudo, inclusive gerir os papéis dos outros.',
  mestre: 'Edita e publica conteúdo e mapas; lê jogadores e o log.',
  moderador: 'Lê jogadores, aplica sanções e lê o log.',
  suporte: 'Somente leitura: conteúdo, jogadores e log.',
};

export const PERMISSOES_MESTRE = [
  'painel.entrar',
  'conteudo.ler',
  'conteudo.editar',
  'conteudo.publicar',
  'mapas.editar',
  'jogadores.ler',
  'jogadores.ajustar',
  'jogadores.sancionar',
  'papeis.gerir',
  'log.ler',
] as const;
export type PermissaoMestre = (typeof PERMISSOES_MESTRE)[number];

export const NOME_DA_PERMISSAO: Readonly<Record<PermissaoMestre, string>> = {
  'painel.entrar': 'Entrar no painel',
  'conteudo.ler': 'Ler conteúdo',
  'conteudo.editar': 'Editar conteúdo (rascunho)',
  'conteudo.publicar': 'Publicar conteúdo',
  'mapas.editar': 'Editar mapas',
  'jogadores.ler': 'Ver jogadores',
  'jogadores.ajustar': 'Ajustar ouro, Diamantes, XP e itens',
  'jogadores.sancionar': 'Aplicar sanções',
  'papeis.gerir': 'Gerir papéis',
  'log.ler': 'Ler o log administrativo',
};

const PERMISSOES_DO_PAPEL: Readonly<Record<PapelMestre, readonly PermissaoMestre[]>> = {
  dono: PERMISSOES_MESTRE,
  mestre: ['painel.entrar', 'conteudo.ler', 'conteudo.editar', 'conteudo.publicar', 'mapas.editar', 'jogadores.ler', 'log.ler'],
  moderador: ['painel.entrar', 'jogadores.ler', 'jogadores.sancionar', 'log.ler'],
  suporte: ['painel.entrar', 'conteudo.ler', 'jogadores.ler', 'log.ler'],
};

export function ehPapelMestre(valor: unknown): valor is PapelMestre {
  return typeof valor === 'string' && (PAPEIS_MESTRE as readonly string[]).includes(valor);
}

export function permissoesDoPapel(papel: PapelMestre): readonly PermissaoMestre[] {
  return PERMISSOES_DO_PAPEL[papel];
}

export function papelTem(papel: PapelMestre, permissao: PermissaoMestre): boolean {
  return PERMISSOES_DO_PAPEL[papel].includes(permissao);
}

/** Motivo obrigatório nas ações que mudam papéis e jogadores (3.5.4.2). */
export const MOTIVO_MINIMO = 5;
export const MOTIVO_MAXIMO = 300;
