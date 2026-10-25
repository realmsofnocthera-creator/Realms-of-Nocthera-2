import { FAIXAS_DA_ARENA, faixaDaArena, presenteDaFaixaDaArena } from '@/rules/arena';
import { semanaDe } from '@/rules/chefeSemanal';
import { randomUUID } from 'node:crypto';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { CAMPOS_DOS_COLECIONAVEIS, ehCampoDosColecionaveis, LIMITE_DE_MATERIAL_POR_PEDIDO, MAXIMO_DE_MATERIAIS_POR_PEDIDO } from '@/rules/ajustes';
import { chefeDoDia, FAIXAS_DO_CHEFE_MUNDIAL, faixaDoChefeMundial, presenteDaFaixa } from '@/rules/chefeMundial';
import { SELOS_DE_BUSCA, type SelosDoJogador } from '@/rules/colecionaveis';
import {
  MENSAGENS_MAXIMAS,
  mensagemValida,
  presenteDoDocumento,
  presenteVazio,
  TEXTO_MAXIMO,
  TITULO_MAXIMO,
  VALIDADE_DO_CORREIO_MS,
  type MensagemDoCorreio,
  type MensagemGeral,
  type PresenteDoCorreio,
} from '@/rules/correio';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { comTitulos, ehTitulo } from '@/rules/titulos';
import { CARTAS_MAXIMAS } from '@/rules/almas';
import { MAX_ARMAS_POR_PERSONAGEM } from '@/game/forja';
import { MAX_ARMADURAS_POR_PERSONAGEM } from '@/game/armaduraForja';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { comRegistro, ErroMestre, exigir, type SessaoMestre } from '@/server/mestre';
import { repositorio, type ContextoTransacao } from '@/server/persistencia';
import { comLimiteSilencioso } from '@/server/sancoes';

/**
 * Correio: as mensagens com presentes. As do jogador ficam no personagem; as para todos, em correioGeral (lidas com um
 * cache curto). As recompensas do Chefe Mundial entram aqui quando o dia fecha: na primeira vez que o jogador abre o
 * jogo (ou o Correio) depois da meia-noite, o servidor calcula a posição final e manda a mensagem.
 */

export class ErroDeCorreio extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeCorreio';
  }
}

/** Uma mensagem na tela (as para todos vêm marcadas). */
export interface MensagemNaTela extends MensagemDoCorreio {
  paraTodos?: boolean;
}

export interface EstadoDoCorreio {
  mensagens: MensagemNaTela[];
  /** Mensagens com presente ainda não resgatado (o ponto do botão no HUD). */
  naoResgatadas: number;
}

const MENSAGENS_GERAIS_LIDAS = 50;
const CACHE_DAS_GERAIS_MS = 60_000;
let geraisGuardadas: { em: number; lista: MensagemGeral[] } | null = null;

export function limparCacheDoCorreio() {
  geraisGuardadas = null;
}

async function mensagensGerais(agora: Date): Promise<MensagemGeral[]> {
  if (geraisGuardadas && agora.getTime() - geraisGuardadas.em < CACHE_DAS_GERAIS_MS) return geraisGuardadas.lista;
  const desde = new Date(agora.getTime() - VALIDADE_DO_CORREIO_MS).toISOString();
  const lista = await repositorio.listarMensagensGerais(desde, MENSAGENS_GERAIS_LIDAS);
  geraisGuardadas = { em: agora.getTime(), lista };
  return lista;
}

/** Uma mensagem nova, válida por 30 dias a partir de agora. */
export function novaMensagem(dados: { titulo: string; texto: string; de: string; presente?: PresenteDoCorreio }, agora: Date, prefixo = 'm'): MensagemDoCorreio {
  return {
    id: `${prefixo}_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    titulo: dados.titulo,
    texto: dados.texto,
    de: dados.de,
    criadaEm: agora.toISOString(),
    expiraEm: new Date(agora.getTime() + VALIDADE_DO_CORREIO_MS).toISOString(),
    ...(dados.presente && !presenteVazio(dados.presente) ? { presente: dados.presente } : {}),
  };
}

/**
 * A caixa do jogador com a mensagem nova: tira as vencidas e guarda no máximo 100. Passando disso, saem primeiro as
 * mais antigas sem presente por resgatar (avisos do Mercado, presentes já resgatados); só depois as outras.
 */
export function comMensagem(caixa: readonly MensagemDoCorreio[] | undefined, mensagem: MensagemDoCorreio, agora: Date): MensagemDoCorreio[] {
  const lista = [...(caixa ?? []).filter((m) => mensagemValida(m, agora)), mensagem];
  let sobra = lista.length - MENSAGENS_MAXIMAS;
  if (sobra <= 0) return lista;
  const pendente = (m: MensagemDoCorreio) => !!m.presente && !m.resgatada;
  const fora = new Set<string>();
  for (const m of lista) {
    if (sobra <= 0) break;
    if (m !== mensagem && !pendente(m)) {
      fora.add(m.id);
      sobra--;
    }
  }
  return lista.filter((m) => !fora.has(m.id)).slice(-MENSAGENS_MAXIMAS);
}

/**
 * Manda ao Correio as recompensas do Chefe Mundial dos dias que já fecharam. A posição é contada fora da transação:
 * o dia acabou, ninguém muda mais os danos.
 */
export async function mandarRecompensasDoChefeMundial(uid: string, agora = new Date()): Promise<void> {
  const char = await repositorio.lerPersonagem(uid);
  const hoje = diaDeBrasilia(agora);
  const pendentes = (char?.chefeMundial ?? []).filter((p) => !p.enviada && p.dia < hoje);
  if (!char || !pendentes.length) return;
  // Limite silencioso (6.5-7): a recompensa é a da última faixa, sem aviso
  const oculto = await comLimiteSilencioso(uid);
  const resultados = await Promise.all(
    pendentes.map(async (p) => {
      const entrada = (oculto ? await repositorio.lerEntradaChefeMundial(p.dia, uid, true) : null) ?? (await repositorio.lerEntradaChefeMundial(p.dia, uid));
      if (!entrada) return { dia: p.dia, mensagem: null };
      const contada = (await repositorio.contarAcimaNoChefeMundial(p.dia, entrada.dano)) + 1;
      const posicao = oculto ? Math.max(contada, FAIXAS_DO_CHEFE_MUNDIAL[FAIXAS_DO_CHEFE_MUNDIAL.length - 1].de) : contada;
      const faixa = faixaDoChefeMundial(posicao);
      const [ano, mes, d] = p.dia.split('-');
      return {
        dia: p.dia,
        mensagem: novaMensagem(
          {
            titulo: `Chefe Mundial: ${faixa.nome}`,
            texto: `Você ficou em ${posicao}º no Chefe Mundial de ${d}/${mes}/${ano} (${chefeDoDia(p.dia).nome}), com ${entrada.dano.toLocaleString('pt-BR')} de dano.`,
            de: 'Chefe Mundial',
            presente: presenteDaFaixa(faixa),
          },
          agora
        ),
      };
    })
  );
  await repositorio.executarTransacao('correio:chefeMundial', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    let caixa = eu.correio ?? [];
    const enviados = new Set<string>();
    for (const r of resultados) {
      const p = (eu.chefeMundial ?? []).find((x) => x.dia === r.dia);
      if (!p || p.enviada) continue;
      enviados.add(r.dia);
      if (r.mensagem) caixa = comMensagem(caixa, r.mensagem, agora);
    }
    if (!enviados.size) return;
    salvarPersonagem(ctx, eu, { correio: caixa, chefeMundial: (eu.chefeMundial ?? []).map((x) => (enviados.has(x.dia) ? { ...x, enviada: true } : x)) });
  });
}

/**
 * Manda ao Correio os prêmios da Arena das semanas que já fecharam (7.5). A posição é contada fora da transação: a
 * semana acabou, ninguém muda mais os pontos. Do 101º em diante, só ganha quem fez pelo menos 1 luta.
 */
export async function mandarPremiosDaArena(uid: string, agora = new Date()): Promise<void> {
  const char = await repositorio.lerPersonagem(uid);
  const atual = semanaDe(agora);
  const pendentes = (char?.arena ?? []).filter((s) => !s.premiada && s.semana < atual);
  if (!char || !pendentes.length) return;
  const oculto = await comLimiteSilencioso(uid);
  const ultimaFaixa = FAIXAS_DA_ARENA[FAIXAS_DA_ARENA.length - 1];
  const resultados = await Promise.all(
    pendentes.map(async (s) => {
      const entrada = (oculto ? await repositorio.lerEntradaDaArena(s.semana, uid, true) : null) ?? (await repositorio.lerEntradaDaArena(s.semana, uid));
      if (!entrada) return { semana: s.semana, mensagem: null };
      const contada = (await repositorio.contarAcimaNaArena(s.semana, entrada.pontos)) + 1;
      // Limite silencioso (6.5-7): a recompensa é a da última faixa, sem aviso
      const posicao = oculto || entrada.oculto ? Math.max(contada, ultimaFaixa.de) : contada;
      const faixa = faixaDaArena(posicao);
      if (faixa === ultimaFaixa && entrada.lutas < 1) return { semana: s.semana, mensagem: null };
      const [ano, mes, d] = s.semana.split('-');
      return {
        semana: s.semana,
        mensagem: novaMensagem(
          {
            titulo: `Arena: ${faixa.nome}`,
            texto: `Você terminou a semana de ${d}/${mes}/${ano} da Arena em ${posicao}º, com ${entrada.pontos.toLocaleString('pt-BR')} pontos.`,
            de: 'Arena',
            presente: presenteDaFaixaDaArena(faixa),
          },
          agora
        ),
      };
    })
  );
  await repositorio.executarTransacao('correio:arena', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    let caixa = eu.correio ?? [];
    const enviadas = new Set<string>();
    for (const r of resultados) {
      const s = (eu.arena ?? []).find((x) => x.semana === r.semana);
      if (!s || s.premiada) continue;
      enviadas.add(r.semana);
      if (r.mensagem) caixa = comMensagem(caixa, r.mensagem, agora);
    }
    if (!enviadas.size) return;
    salvarPersonagem(ctx, eu, { correio: caixa, arena: (eu.arena ?? []).map((x) => (enviadas.has(x.semana) ? { ...x, premiada: true } : x)) });
  });
}

function montarEstado(char: CharacterDocument, gerais: readonly MensagemGeral[], agora: Date): EstadoDoCorreio {
  const doJogador: MensagemNaTela[] = (char.correio ?? []).filter((m) => mensagemValida(m, agora));
  const marcas = char.correioGeral ?? {};
  const paraTodos: MensagemNaTela[] = gerais
    .filter((m) => mensagemValida(m, agora) && marcas[m.id] !== 'apagada')
    .map((m) => ({ ...m, paraTodos: true, ...(marcas[m.id] === 'resgatada' ? { resgatada: true } : {}) }));
  const mensagens = [...doJogador, ...paraTodos].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  return { mensagens, naoResgatadas: mensagens.filter((m) => m.presente && !m.resgatada).length };
}

export async function estadoDoCorreio(uid: string, agora = new Date()): Promise<EstadoDoCorreio> {
  await mandarRecompensasDoChefeMundial(uid, agora);
  await mandarPremiosDaArena(uid, agora);
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  return montarEstado(char, await mensagensGerais(agora), agora);
}

/** Entrega o presente no personagem (dentro da transação): moedas com extrato, selos, saldos e materiais. */
export function entregarPresente(ctx: ContextoTransacao, char: CharacterDocument, presente: PresenteDoCorreio, motivo: string): { doc: CharacterDocument; patch: Partial<CharacterDocument> } {
  let doc = char;
  for (const moeda of ['ouro', 'diamantes', 'essenciaDeSoberano'] as const) {
    if (presente[moeda]) doc = alterarSaldoEm(ctx, doc, moeda, presente[moeda]!, motivo).character;
  }
  const patch: Partial<CharacterDocument> = { ouro: doc.ouro, diamantes: doc.diamantes, essenciaDeSoberano: doc.essenciaDeSoberano };
  if (presente.selos) {
    const selos: SelosDoJogador = { ...(doc.selosDeBusca ?? {}) };
    for (const s of SELOS_DE_BUSCA) if (presente.selos[s]) selos[s] = (selos[s] ?? 0) + presente.selos[s]!;
    patch.selosDeBusca = selos;
  }
  for (const saldo of ['fragmentosDeMemoria', 'pedrasDaRecordacao', 'avancosDeExpedicao'] as const) {
    if (presente[saldo]) patch[saldo] = (doc[saldo] ?? 0) + presente[saldo]!;
  }
  if (presente.materiais) {
    const inventario = { ...(doc.inventario ?? {}) };
    for (const [id, q] of Object.entries(presente.materiais)) inventario[id] = (inventario[id] ?? 0) + q;
    patch.inventario = inventario;
  }
  if (presente.titulos?.length) patch.titulos = comTitulos(doc.titulos, presente.titulos);
  if (presente.cartas?.length) {
    const itens = doc.cartasItens ?? [];
    if (itens.length + presente.cartas.length > CARTAS_MAXIMAS) throw new ErroDeCorreio(`Suas cartas estão cheias (${CARTAS_MAXIMAS}). Destrua ou venda algumas para resgatar.`);
    patch.cartasItens = [...itens, ...presente.cartas];
    patch.cartasDescobertas = [...new Set([...(doc.cartasDescobertas ?? []), ...presente.cartas.map((c) => c.tipo)])];
  }
  if (presente.emblemas?.length) patch.emblemasItens = [...(doc.emblemasItens ?? []), ...presente.emblemas];
  if (presente.armas?.length) {
    const armas = doc.armas ?? [];
    if (armas.length + presente.armas.length > MAX_ARMAS_POR_PERSONAGEM) throw new ErroDeCorreio(`Suas armas estão cheias (${MAX_ARMAS_POR_PERSONAGEM}). Venda ou use algumas para resgatar.`);
    patch.armas = [...armas, ...presente.armas];
  }
  if (presente.armaduras?.length) {
    const armaduras = doc.armaduras ?? [];
    if (armaduras.length + presente.armaduras.length > MAX_ARMADURAS_POR_PERSONAGEM) throw new ErroDeCorreio(`Suas armaduras estão cheias (${MAX_ARMADURAS_POR_PERSONAGEM}). Venda ou use algumas para resgatar.`);
    patch.armaduras = [...armaduras, ...presente.armaduras];
  }
  return { doc, patch };
}

export const ACOES_DO_CORREIO = ['resgatar', 'resgatarTudo', 'apagar'] as const;
export type AcaoDoCorreio = (typeof ACOES_DO_CORREIO)[number];

export async function agirNoCorreio(uid: string, acao: unknown, pedido: { id?: unknown }, agora = new Date()): Promise<{ mensagem: string; estado: EstadoDoCorreio }> {
  if (typeof acao !== 'string' || !(ACOES_DO_CORREIO as readonly string[]).includes(acao)) throw new ErroDeCorreio('Ação desconhecida.');
  const gerais = await mensagensGerais(agora);
  const id = typeof pedido.id === 'string' ? pedido.id : '';
  if (acao !== 'resgatarTudo' && !id) throw new ErroDeCorreio('Escolha a mensagem.');
  const texto = await repositorio.executarTransacao(`correio:${acao}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const caixa = (eu.correio ?? []).filter((m) => mensagemValida(m, agora));
    const marcas = { ...(eu.correioGeral ?? {}) };
    // Só guarda as marcas das mensagens para todos que ainda existem
    for (const k of Object.keys(marcas)) if (!gerais.some((g) => g.id === k)) delete marcas[k];

    if (acao === 'apagar') {
      const minha = caixa.find((m) => m.id === id);
      if (minha) {
        if (minha.presente && !minha.resgatada) throw new ErroDeCorreio('Resgate o presente antes de apagar a mensagem.');
        salvarPersonagem(ctx, eu, { correio: caixa.filter((m) => m.id !== id), correioGeral: marcas });
        return 'Mensagem apagada.';
      }
      const geral = gerais.find((g) => g.id === id && mensagemValida(g, agora));
      if (!geral) throw new ErroDeCorreio('Mensagem não encontrada.');
      if (geral.presente && marcas[id] !== 'resgatada') throw new ErroDeCorreio('Resgate o presente antes de apagar a mensagem.');
      salvarPersonagem(ctx, eu, { correioGeral: { ...marcas, [id]: 'apagada' } });
      return 'Mensagem apagada.';
    }

    // resgatar uma ou todas
    const minhas = caixa.filter((m) => m.presente && !m.resgatada && (acao === 'resgatarTudo' || m.id === id));
    const deTodos: MensagemGeral[] = [];
    for (const g of gerais) {
      if (!g.presente || marcas[g.id] || !mensagemValida(g, agora) || (acao === 'resgatar' && g.id !== id)) continue;
      // relê a mensagem dentro da transação: o presente vem do banco, não do cache
      const lida = await ctx.lerMensagemGeral(g.id);
      if (lida?.presente && mensagemValida(lida, agora)) deTodos.push(lida);
    }
    if (!minhas.length && !deTodos.length) throw new ErroDeCorreio(acao === 'resgatar' ? 'Esse presente não está disponível.' : 'Não há presentes para resgatar.');
    let doc = eu;
    let patch: Partial<CharacterDocument> = {};
    for (const m of [...minhas, ...deTodos]) {
      const r = entregarPresente(ctx, { ...doc, ...patch } as CharacterDocument, m.presente!, `Correio: ${m.titulo}`);
      doc = r.doc;
      patch = { ...patch, ...r.patch };
    }
    const resgatadas = new Set(minhas.map((m) => m.id));
    salvarPersonagem(ctx, doc, {
      ...patch,
      correio: caixa.map((m) => (resgatadas.has(m.id) ? { ...m, resgatada: true } : m)),
      correioGeral: { ...marcas, ...Object.fromEntries(deTodos.map((g) => [g.id, 'resgatada' as const])) },
    });
    const n = minhas.length + deTodos.length;
    return n === 1 ? 'Presente resgatado!' : `${n} presentes resgatados!`;
  });
  const char = await repositorio.lerPersonagem(uid);
  return { mensagem: texto, estado: montarEstado(char!, gerais, agora) };
}

// ---------------------------------------------------------------------------------------------------------------
// Mestre: mandar mensagem para um jogador ou para todos
// ---------------------------------------------------------------------------------------------------------------

export interface PedidoDeMensagemDoMestre {
  /** "todos" ou o uid do jogador. */
  destino?: unknown;
  titulo?: unknown;
  texto?: unknown;
  /** Os mesmos campos dos ajustes: ouro, diamantes, essenciaDeSoberano, seloDesgastado… */
  campos?: unknown;
  materiais?: unknown;
  /** Ids de títulos do perfil que vão junto. */
  titulos?: unknown;
}

const ID_VALIDO = /^[a-zA-Z0-9_-]{1,128}$/;
const LIMITE_DO_PRESENTE = 1_000_000;

/** Monta o presente a partir dos campos do painel (os nomes dos ajustes do Mestre). */
function presenteDoPedido(campos: unknown, materiais: unknown, titulos?: unknown): PresenteDoCorreio | undefined {
  const c = campos && typeof campos === 'object' && !Array.isArray(campos) ? (campos as Record<string, unknown>) : {};
  const bruto: Record<string, unknown> = { selos: {} };
  for (const [campo, valor] of Object.entries(c)) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0 || valor > LIMITE_DO_PRESENTE) throw new ErroMestre(400, `${campo}: informe um número inteiro positivo.`);
    if (campo === 'ouro' || campo === 'diamantes' || campo === 'essenciaDeSoberano') bruto[campo] = valor;
    else if (ehCampoDosColecionaveis(campo)) {
      const alvo = CAMPOS_DOS_COLECIONAVEIS[campo];
      if ('selo' in alvo) (bruto.selos as Record<string, number>)[alvo.selo] = valor;
      else bruto[alvo.saldo] = valor;
    } else throw new ErroMestre(400, `Campo não permitido no presente: ${campo}.`);
  }
  const m = materiais && typeof materiais === 'object' && !Array.isArray(materiais) ? (materiais as Record<string, unknown>) : {};
  const ids = Object.keys(m).filter((id) => m[id] !== undefined && m[id] !== null && m[id] !== '');
  if (ids.length > MAXIMO_DE_MATERIAIS_POR_PEDIDO) throw new ErroMestre(400, `No máximo ${MAXIMO_DE_MATERIAIS_POR_PEDIDO} materiais por mensagem.`);
  for (const id of ids) {
    const v = m[id];
    if (!MATERIAIS_MAP[id] && !MATERIAIS_MUNDO_MAP[id]) throw new ErroMestre(400, `Material desconhecido: ${id}.`);
    if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0 || v > LIMITE_DE_MATERIAL_POR_PEDIDO) throw new ErroMestre(400, `Material ${id}: informe um inteiro positivo, até ${LIMITE_DE_MATERIAL_POR_PEDIDO}.`);
  }
  if (ids.length) bruto.materiais = Object.fromEntries(ids.map((id) => [id, m[id]]));
  if (titulos !== undefined && titulos !== null) {
    if (!Array.isArray(titulos) || titulos.some((t) => !ehTitulo(t))) throw new ErroMestre(400, 'Título desconhecido.');
    if (titulos.length) bruto.titulos = titulos;
  }
  return presenteDoDocumento(bruto);
}

/** O Dono manda uma mensagem (com ou sem presente) para um jogador ou para todos. Tudo fica no log administrativo. */
export async function enviarMensagemDoMestre(sessao: SessaoMestre, pedido: PedidoDeMensagemDoMestre, ip?: string, agora = new Date()): Promise<{ id: string; destino: string }> {
  exigir(sessao, 'jogadores.ajustar');
  const titulo = typeof pedido.titulo === 'string' ? pedido.titulo.trim() : '';
  const texto = typeof pedido.texto === 'string' ? pedido.texto.trim() : '';
  if (titulo.length < 3 || titulo.length > TITULO_MAXIMO) throw new ErroMestre(400, `O título precisa ter de 3 a ${TITULO_MAXIMO} caracteres.`);
  if (texto.length < 3 || texto.length > TEXTO_MAXIMO) throw new ErroMestre(400, `O texto precisa ter de 3 a ${TEXTO_MAXIMO} caracteres.`);
  const presente = presenteDoPedido(pedido.campos, pedido.materiais, pedido.titulos);
  const destino = pedido.destino === 'todos' ? 'todos' : typeof pedido.destino === 'string' && ID_VALIDO.test(pedido.destino) ? pedido.destino : '';
  if (!destino) throw new ErroMestre(400, 'Escolha o destino: "todos" ou o uid do jogador.');
  if (destino === 'todos') {
    const mensagem = novaMensagem({ titulo, texto, de: 'Mestre', presente }, agora, 'cg');
    await comRegistro(sessao, { acao: 'correio.todos', alvo: 'todos', depois: { titulo, presente: presente ?? null }, motivo: titulo, ip }, () => repositorio.gravarMensagemGeral(mensagem));
    limparCacheDoCorreio();
    return { id: mensagem.id, destino };
  }
  if (!(await repositorio.lerPersonagem(destino))) throw new ErroMestre(404, 'Nenhum jogador com esse identificador.');
  const mensagem = novaMensagem({ titulo, texto, de: 'Mestre', presente }, agora);
  await comRegistro(sessao, { acao: 'correio.jogador', alvo: destino, depois: { titulo, presente: presente ?? null }, motivo: titulo, ip }, () =>
    repositorio.executarTransacao('correio:mestre', async (ctx) => {
      const alvo = await carregarPersonagem(ctx, destino);
      salvarPersonagem(ctx, alvo, { correio: comMensagem(alvo.correio, mensagem, agora) });
    })
  );
  return { id: mensagem.id, destino };
}
