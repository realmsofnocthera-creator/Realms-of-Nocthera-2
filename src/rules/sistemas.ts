/**
 * Feature flags e modo manutenção (3.5.5.2). O Dono desliga e liga sistemas do jogo sem deploy, com mensagem
 * para o jogador. Quem tem papel no painel continua entrando (para testar e para religar).
 */
export const SISTEMAS = [
  { id: 'combate', nome: 'Arena de combate' },
  { id: 'cacada', nome: 'Provação da Caçada' },
  { id: 'batalhaSangrenta', nome: 'Provação da Batalha Sangrenta' },
  { id: 'torre', nome: 'Provação da Torre Celestial' },
  { id: 'guerreiro', nome: 'Provação do Guerreiro' },
  { id: 'forja', nome: 'Forja e Ferreiro (armas e armaduras)' },
  { id: 'campanha', nome: 'Campanha (explorar o mundo)' },
] as const;
export type SistemaId = (typeof SISTEMAS)[number]['id'];

export const NOME_DO_SISTEMA: Readonly<Record<SistemaId, string>> = Object.fromEntries(SISTEMAS.map((s) => [s.id, s.nome])) as Record<SistemaId, string>;

export function ehSistema(v: unknown): v is SistemaId {
  return typeof v === 'string' && SISTEMAS.some((s) => s.id === v);
}

export const MENSAGEM_MAXIMA = 300;
export const MENSAGEM_PADRAO_MANUTENCAO = 'O jogo está em manutenção. Volte em instantes.';
export const mensagemPadraoDoSistema = (id: SistemaId) => `${NOME_DO_SISTEMA[id]} está temporariamente desligado(a). Tente de novo mais tarde.`;

export interface EstadoDoSistema {
  ativo: boolean;
  /** Mensagem ao jogador quando desligado; vazia = a padrão. */
  mensagem: string;
}

export interface ConfiguracaoDeSistemas {
  manutencao: { ativa: boolean; mensagem: string };
  /** Campanha (5.5): o mapa onde o jogador começa (vazio = a Campanha ainda não começou) e a cena de abertura, tocada uma vez antes do primeiro mapa (vazio = sem abertura). */
  campanha: { mapaInicial: string; aberturaCenaId: string };
  sistemas: Record<SistemaId, EstadoDoSistema>;
  atualizadoEm: string;
  atualizadoPor: string;
}

export function configuracaoPadrao(): ConfiguracaoDeSistemas {
  return {
    manutencao: { ativa: false, mensagem: '' },
    campanha: { mapaInicial: '', aberturaCenaId: '' },
    sistemas: Object.fromEntries(SISTEMAS.map((s) => [s.id, { ativo: true, mensagem: '' }])) as Record<SistemaId, EstadoDoSistema>,
    atualizadoEm: '',
    atualizadoPor: '',
  };
}

/** Lê um documento do banco com tolerância: o que faltar ou estiver errado volta ao padrão (tudo ligado). */
export function configuracaoDoDocumento(bruto: unknown): ConfiguracaoDeSistemas {
  const base = configuracaoPadrao();
  if (typeof bruto !== 'object' || bruto === null) return base;
  const d = bruto as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' ? v.slice(0, MENSAGEM_MAXIMA) : '');
  const m = d.manutencao as Record<string, unknown> | undefined;
  if (m && typeof m === 'object') base.manutencao = { ativa: m.ativa === true, mensagem: texto(m.mensagem) };
  const c = d.campanha as Record<string, unknown> | undefined;
  if (c && typeof c === 'object') {
    const idValido = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{1,47}$/.test(v);
    base.campanha = { mapaInicial: idValido(c.mapaInicial) ? c.mapaInicial : '', aberturaCenaId: idValido(c.aberturaCenaId) ? c.aberturaCenaId : '' };
  }
  const s = d.sistemas as Record<string, unknown> | undefined;
  if (s && typeof s === 'object') {
    for (const sistema of SISTEMAS) {
      const e = s[sistema.id] as Record<string, unknown> | undefined;
      if (e && typeof e === 'object') base.sistemas[sistema.id] = { ativo: e.ativo !== false, mensagem: texto(e.mensagem) };
    }
  }
  base.atualizadoEm = texto(d.atualizadoEm);
  base.atualizadoPor = texto(d.atualizadoPor);
  return base;
}

export const mensagemDaManutencao = (c: ConfiguracaoDeSistemas) => c.manutencao.mensagem.trim() || MENSAGEM_PADRAO_MANUTENCAO;
export const mensagemDoSistema = (c: ConfiguracaoDeSistemas, id: SistemaId) => c.sistemas[id].mensagem.trim() || mensagemPadraoDoSistema(id);

/** O que qualquer pessoa pode ver (sem login): se há manutenção e quais sistemas estão desligados. */
export interface StatusPublico {
  manutencao: { ativa: boolean; mensagem: string };
  desligados: { id: SistemaId; nome: string; mensagem: string }[];
}

export function statusPublico(c: ConfiguracaoDeSistemas): StatusPublico {
  return {
    manutencao: { ativa: c.manutencao.ativa, mensagem: c.manutencao.ativa ? mensagemDaManutencao(c) : '' },
    desligados: SISTEMAS.filter((s) => !c.sistemas[s.id].ativo).map((s) => ({ id: s.id, nome: s.nome, mensagem: mensagemDoSistema(c, s.id) })),
  };
}
