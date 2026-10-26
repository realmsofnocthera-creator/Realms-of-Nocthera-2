import { semanaDe } from '@/rules/chefeSemanal';
import { chaveDoNomeDaGuilda, nivelDaGuilda, resumoDaGuilda, validarNomeDaGuilda, type CargoDaGuilda, type GuildaDocumento } from '@/rules/guilda';
import { partyVale } from '@/rules/testeEquipe';
import { desfazerNoContexto, limparCacheDasGuildas, regras } from '@/server/guildas';
import { comRegistro, ErroMestre, exigir, motivoValido, type SessaoMestre } from '@/server/mestre';
import { chaveDoNomeDeGuilda, repositorio } from '@/server/persistencia';

/**
 * Ferramentas do Mestre para guildas e parties (7.10, decididas pelo Yuri em 26/10/2026): ver as guildas e as parties
 * no Painel; renomear uma guilda, apagar a descrição ou dissolvê-la (nome ou texto ofensivo). Ver é de quem lê jogadores;
 * mudar é de quem pode sancionar (Moderador e Dono). Toda mudança exige o motivo e fica no log, gravado antes da mudança.
 */

const LIMITE_DA_LISTA = 30;
const LIMITE_DAS_PARTYS = 50;

export interface GuildaNoPainel {
  id: string;
  nome: string;
  descricao: string;
  lider: string;
  membros: number;
  xp: number;
  nivel: string;
}

export interface GuildaDetalhada extends GuildaNoPainel {
  criadaEm: string;
  membrosDaGuilda: { uid: string; nome: string; cargo: CargoDaGuilda; entrouEm: string }[];
  convites: number;
  pedidos: number;
}

export interface PartyNoPainel {
  id: string;
  lider: string;
  membros: { nome: string; pronto: boolean }[];
  convites: number;
  atualizadaEm: string;
  /** Mexida há menos de 2 horas (senão ela some sozinha). */
  viva: boolean;
}

const noPainel = (g: GuildaDocumento, r: Awaited<ReturnType<typeof regras>>): GuildaNoPainel => {
  const s = resumoDaGuilda(g);
  return { id: s.id, nome: s.nome, descricao: s.descricao, lider: s.lider, membros: s.quantidadeMembros, xp: s.xp, nivel: nivelDaGuilda(g.xp, r).nome };
};

/** As guildas com mais membros, ou as que começam com o nome buscado. Ver é de quem lê jogadores. */
export async function listarGuildasDoMestre(sessao: SessaoMestre, buscaBruta?: unknown): Promise<GuildaNoPainel[]> {
  exigir(sessao, 'jogadores.ler');
  const busca = typeof buscaBruta === 'string' ? chaveDoNomeDaGuilda(buscaBruta) : '';
  const [r, guildas] = await Promise.all([regras(), busca ? repositorio.buscarGuildasPorPrefixo(busca, LIMITE_DA_LISTA) : repositorio.listarGuildas(LIMITE_DA_LISTA)]);
  return guildas.map((g) => noPainel(g, r));
}

const idValido = (id: unknown): string => {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new ErroMestre(400, 'Escolha a guilda.');
  return id;
};

export async function verGuildaDoMestre(sessao: SessaoMestre, idBruto: unknown): Promise<GuildaDetalhada> {
  exigir(sessao, 'jogadores.ler');
  const id = idValido(idBruto);
  const [r, g] = await Promise.all([regras(), repositorio.lerGuilda(id)]);
  if (!g) throw new ErroMestre(404, 'Essa guilda não existe mais.');
  return {
    ...noPainel(g, r),
    criadaEm: g.criadaEm,
    membrosDaGuilda: g.membros.map((m) => ({ uid: m.uid, nome: m.nome, cargo: m.cargo, entrouEm: m.entrouEm })),
    convites: g.convites.length,
    pedidos: g.pedidos.length,
  };
}

export type AcaoDaGuildaDoMestre = 'renomear' | 'apagarDescricao' | 'dissolver';
export interface PedidoDeGuildaDoMestre {
  acao?: unknown;
  id?: unknown;
  nome?: unknown;
  motivo?: unknown;
}

/** Renomear, apagar a descrição ou dissolver. Devolve a mensagem para o Painel. */
export async function mudarGuildaDoMestre(sessao: SessaoMestre, pedido: PedidoDeGuildaDoMestre, ip?: string): Promise<{ mensagem: string }> {
  exigir(sessao, 'jogadores.sancionar');
  const id = idValido(pedido.id);
  const motivo = motivoValido(pedido.motivo);
  const antes = await repositorio.lerGuilda(id);
  if (!antes) throw new ErroMestre(404, 'Essa guilda não existe mais.');
  let resultado: { mensagem: string };
  switch (pedido.acao) {
    case 'renomear': {
      const nome = validarNomeDaGuilda(pedido.nome);
      if (!nome.ok) throw new ErroMestre(400, nome.erro);
      resultado = await comRegistro(sessao, { acao: 'guilda.renomear', alvo: id, antes: { nome: antes.nome }, depois: { nome: nome.nome }, motivo, ip }, () => renomear(id, nome.nome));
      break;
    }
    case 'apagarDescricao':
      resultado = await comRegistro(sessao, { acao: 'guilda.apagarDescricao', alvo: id, antes: { nome: antes.nome, descricao: antes.descricao }, motivo, ip }, () => apagarDescricao(id));
      break;
    case 'dissolver':
      resultado = await comRegistro(sessao, { acao: 'guilda.dissolver', alvo: id, antes: { nome: antes.nome, membros: antes.membros.length }, motivo, ip }, () => dissolver(id, motivo));
      break;
    default:
      throw new ErroMestre(400, 'Ação desconhecida.');
  }
  limparCacheDasGuildas();
  return resultado;
}

async function renomear(id: string, nomeNovo: string): Promise<{ mensagem: string }> {
  return repositorio.executarTransacao('guilda:renomearMestre', async (ctx) => {
    const guilda = await ctx.lerGuilda(id);
    if (!guilda) throw new ErroMestre(404, 'Essa guilda não existe mais.');
    const chaveNova = chaveDoNomeDeGuilda(nomeNovo);
    const chaveAntiga = chaveDoNomeDeGuilda(guilda.nome);
    if (chaveNova !== chaveAntiga && (await ctx.lerDonoDoNomeDeGuilda(chaveNova))) throw new ErroMestre(409, 'Já existe uma guilda com esse nome.');
    // leituras antes das gravações (regra do Firestore): os membros e o chefe da semana, que guardam o nome
    const membros = await Promise.all(guilda.membros.map((m) => ctx.lerPersonagem(m.uid)));
    const semana = semanaDe(new Date());
    const chefe = await ctx.lerEntradaChefeSemanal(semana, id);
    if (chaveNova !== chaveAntiga) {
      ctx.liberarNomeDeGuilda(chaveAntiga);
      ctx.reservarNomeDeGuilda(chaveNova, id, nomeNovo);
    }
    ctx.gravarGuilda({ ...guilda, nome: nomeNovo, nomeBusca: chaveDoNomeDaGuilda(nomeNovo) });
    for (const m of membros) if (m && m.guildaId === id) ctx.gravarPersonagem({ ...m, guildaNome: nomeNovo });
    if (chefe) ctx.gravarEntradaChefeSemanal({ ...chefe, nomeDaGuilda: nomeNovo });
    return { mensagem: `A guilda ${guilda.nome} agora se chama ${nomeNovo}.` };
  });
}

async function apagarDescricao(id: string): Promise<{ mensagem: string }> {
  return repositorio.executarTransacao('guilda:descricaoMestre', async (ctx) => {
    const guilda = await ctx.lerGuilda(id);
    if (!guilda) throw new ErroMestre(404, 'Essa guilda não existe mais.');
    ctx.gravarGuilda({ ...guilda, descricao: '' });
    return { mensagem: `A descrição da guilda ${guilda.nome} foi apagada.` };
  });
}

async function dissolver(id: string, motivo: string): Promise<{ mensagem: string }> {
  return repositorio.executarTransacao('guilda:dissolverMestre', async (ctx) => {
    const guilda = await ctx.lerGuilda(id);
    if (!guilda) throw new ErroMestre(404, 'Essa guilda não existe mais.');
    await desfazerNoContexto(ctx, guilda, undefined, {
      titulo: 'Sua guilda foi desfeita',
      texto: `A guilda ${guilda.nome} foi desfeita pela equipe do jogo. Motivo: ${motivo}. Você pode entrar em outra guilda ou criar uma nova.`,
      de: 'Equipe do jogo',
    });
    return { mensagem: `A guilda ${guilda.nome} foi dissolvida e os ${guilda.membros.length} membros foram avisados pelo Correio.` };
  });
}

/** As parties mexidas mais recentemente (as com mais de 2 horas de silêncio somem sozinhas, mas aparecem como paradas). */
export async function listarPartysDoMestre(sessao: SessaoMestre, agora = new Date()): Promise<PartyNoPainel[]> {
  exigir(sessao, 'jogadores.ler');
  const partys = await repositorio.listarPartys(LIMITE_DAS_PARTYS);
  return partys.map((p) => ({
    id: p.id,
    lider: p.membros.find((m) => m.uid === p.liderUid)?.nome ?? '',
    membros: p.membros.map((m) => ({ nome: m.nome, pronto: m.pronto })),
    convites: p.convites.length,
    atualizadaEm: p.atualizadaEm,
    viva: partyVale(p, agora),
  }));
}
