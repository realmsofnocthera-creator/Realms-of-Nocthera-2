import { LIMITES_DAS_REGRAS_DE_GUILDA, regrasDeGuildaValidas } from '@/rules/guilda';
import { configuracaoPadrao, ehSistema, MENSAGEM_MAXIMA, NOME_DO_SISTEMA, type ConfiguracaoDeSistemas, type SistemaId } from '@/rules/sistemas';
import { comRegistro, ErroMestre, exigir, motivoValido, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { guardarConfiguracaoNoCache, lerConfiguracaoDeSistemas } from '@/server/sistemasLeitura';
import { lerCenaPublicada, lerMapaPublicado } from '@/server/campanha';

/**
 * Lado de escrita dos sistemas (3.5.5.2), só para o Dono. Cada mudança entra no log antes de acontecer, com motivo.
 * O estado novo vale na hora nesta instância e em até TTL_CACHE_SISTEMAS_MS nas outras.
 */

/** A configuração atual, para a aba Sistemas do painel (quem entra no painel vê). */
export async function lerSistemasDoPainel(sessao: SessaoMestre): Promise<ConfiguracaoDeSistemas> {
  exigir(sessao, 'painel.entrar');
  return lerConfiguracaoDeSistemas();
}

export interface PedidoDeSistema {
  /** "manutencao" ou o id de um sistema. */
  alvo: unknown;
  /** true = ligado (ou manutenção ativa, no caso do alvo "manutencao"). */
  ativo: unknown;
  mensagem?: unknown;
  motivo: unknown;
}

/** Liga ou desliga um sistema, ou o modo manutenção, com mensagem ao jogador. */
export async function definirSistema(sessao: SessaoMestre, pedido: PedidoDeSistema, ip?: string): Promise<ConfiguracaoDeSistemas> {
  exigir(sessao, 'sistemas.gerir');
  if (typeof pedido.ativo !== 'boolean') throw new ErroMestre(400, 'Informe se é para ligar ou desligar.');
  const mensagem = pedido.mensagem === undefined || pedido.mensagem === null ? '' : typeof pedido.mensagem === 'string' ? pedido.mensagem.trim() : null;
  if (mensagem === null || mensagem.length > MENSAGEM_MAXIMA) throw new ErroMestre(400, `A mensagem ao jogador vai até ${MENSAGEM_MAXIMA} caracteres.`);
  const motivo = motivoValido(pedido.motivo);
  const alvo = pedido.alvo;
  if (alvo !== 'manutencao' && !ehSistema(alvo)) throw new ErroMestre(400, 'Escolha "manutencao" ou um sistema da lista.');

  const atual = await lerConfiguracaoDeSistemas();
  const proxima: ConfiguracaoDeSistemas = structuredClone(atual ?? configuracaoPadrao());
  proxima.atualizadoEm = new Date().toISOString();
  proxima.atualizadoPor = sessao.uid;
  let antes: Record<string, unknown>;
  let depois: Record<string, unknown>;
  if (alvo === 'manutencao') {
    antes = { ativa: atual.manutencao.ativa, mensagem: atual.manutencao.mensagem };
    proxima.manutencao = { ativa: pedido.ativo, mensagem };
    depois = { ativa: pedido.ativo, mensagem };
  } else {
    const id = alvo as SistemaId;
    antes = { ativo: atual.sistemas[id].ativo, mensagem: atual.sistemas[id].mensagem };
    proxima.sistemas[id] = { ativo: pedido.ativo, mensagem };
    depois = { ativo: pedido.ativo, mensagem };
  }

  await comRegistro(
    sessao,
    { acao: alvo === 'manutencao' ? 'sistema.manutencao' : 'sistema.definir', alvo: alvo === 'manutencao' ? 'manutencao' : `${alvo}:${NOME_DO_SISTEMA[alvo as SistemaId]}`, antes, depois, motivo, ip },
    () => repositorio.gravarConfiguracaoDeSistemas(proxima)
  );
  guardarConfiguracaoNoCache(proxima);
  return proxima;
}

/** Define o mapa onde a Campanha começa (precisa estar publicado e válido); vazio desfaz e a Campanha volta a "ainda não começou". */
export async function definirMapaInicial(sessao: SessaoMestre, pedido: { mapa: unknown; motivo: unknown }, ip?: string): Promise<ConfiguracaoDeSistemas> {
  exigir(sessao, 'sistemas.gerir');
  const motivo = motivoValido(pedido.motivo);
  const mapa = typeof pedido.mapa === 'string' ? pedido.mapa.trim() : null;
  if (mapa === null) throw new ErroMestre(400, 'Escolha o mapa inicial (ou deixe vazio para desfazer).');
  if (mapa !== '' && !(await lerMapaPublicado(mapa))) throw new ErroMestre(400, `O mapa "${mapa}" não está publicado. Publique o mapa antes de torná-lo o início da Campanha.`);
  const atual = await lerConfiguracaoDeSistemas();
  const proxima: ConfiguracaoDeSistemas = structuredClone(atual);
  proxima.campanha = { ...proxima.campanha, mapaInicial: mapa };
  proxima.atualizadoEm = new Date().toISOString();
  proxima.atualizadoPor = sessao.uid;
  await comRegistro(sessao, { acao: 'campanha.mapa-inicial', alvo: 'campanha', antes: { mapaInicial: atual.campanha.mapaInicial }, depois: { mapaInicial: mapa }, motivo, ip }, () =>
    repositorio.gravarConfiguracaoDeSistemas(proxima)
  );
  guardarConfiguracaoNoCache(proxima);
  return proxima;
}

/** Define a cena de abertura da Campanha (tocada uma vez, antes do primeiro mapa; precisa estar publicada); vazio desfaz. */
export async function definirCenaDeAbertura(sessao: SessaoMestre, pedido: { cena: unknown; motivo: unknown }, ip?: string): Promise<ConfiguracaoDeSistemas> {
  exigir(sessao, 'sistemas.gerir');
  const motivo = motivoValido(pedido.motivo);
  const cena = typeof pedido.cena === 'string' ? pedido.cena.trim() : null;
  if (cena === null) throw new ErroMestre(400, 'Escolha a cena de abertura (ou deixe vazio para desfazer).');
  if (cena !== '' && !(await lerCenaPublicada(cena))) throw new ErroMestre(400, `A cena "${cena}" não está publicada. Publique a cena antes de torná-la a abertura da Campanha.`);
  const atual = await lerConfiguracaoDeSistemas();
  const proxima: ConfiguracaoDeSistemas = structuredClone(atual);
  proxima.campanha = { ...proxima.campanha, aberturaCenaId: cena };
  proxima.atualizadoEm = new Date().toISOString();
  proxima.atualizadoPor = sessao.uid;
  await comRegistro(sessao, { acao: 'campanha.cena-abertura', alvo: 'campanha', antes: { aberturaCenaId: atual.campanha.aberturaCenaId }, depois: { aberturaCenaId: cena }, motivo, ip }, () =>
    repositorio.gravarConfiguracaoDeSistemas(proxima)
  );
  guardarConfiguracaoNoCache(proxima);
  return proxima;
}

/** Regras das Guildas (7.3): nível e ouro para criar e o máximo de membros. Vale para as próximas criações e entradas. */
export async function definirRegrasDeGuilda(sessao: SessaoMestre, pedido: { regras: unknown; motivo: unknown }, ip?: string): Promise<ConfiguracaoDeSistemas> {
  exigir(sessao, 'sistemas.gerir');
  const motivo = motivoValido(pedido.motivo);
  const regras = regrasDeGuildaValidas(pedido.regras);
  if (!regras) {
    const { nivelMinimo: n, custoOuro: c, xpPorNivel: x, membrosPorNivel: m } = LIMITES_DAS_REGRAS_DE_GUILDA;
    throw new ErroMestre(
      400,
      `Regras inválidas: nível de ${n[0]} a ${n[1]}, ouro de ${c[0]} a ${c[1]}, 7 valores de XP (${x[0]} a ${x[1]}) e 8 de membros (${m[0]} a ${m[1]}, sem diminuir de um nível para o outro), todos inteiros.`
    );
  }
  const atual = await lerConfiguracaoDeSistemas();
  const proxima: ConfiguracaoDeSistemas = structuredClone(atual);
  proxima.guildas = regras;
  proxima.atualizadoEm = new Date().toISOString();
  proxima.atualizadoPor = sessao.uid;
  await comRegistro(sessao, { acao: 'guildas.regras', alvo: 'guildas', antes: atual.guildas, depois: regras, motivo, ip }, () => repositorio.gravarConfiguracaoDeSistemas(proxima));
  guardarConfiguracaoNoCache(proxima);
  return proxima;
}
