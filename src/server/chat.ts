import { randomUUID } from 'node:crypto';
import { horaDe, idDaRevisao, type EntradaDeRevisao } from '@/rules/integridade';
import {
  BLOQUEADOS_MAXIMOS,
  CONTEXTO_DA_DENUNCIA,
  idDoCanal,
  INTERVALO_DO_CANAL_MS,
  MENSAGENS_POR_CANAL,
  NIVEL_DO_CHAT_GLOBAL,
  NOME_DO_CANAL,
  prepararTexto,
  PRAZO_DA_DENUNCIA_HORAS,
  TEXTO_MAXIMO_DO_CHAT,
  ehCanalDoChat,
  type BloqueadoNoChat,
  type CanalDocumento,
  type CanalDoChat,
  type MensagemDoChat,
} from '@/rules/chat';
import { silencioEmVigor } from '@/rules/sancoes';
import { carregarPersonagem, salvarPersonagem } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';
import { lerSancaoComCache } from '@/server/sancoes';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Chat (7.7). Cada canal é um documento com as últimas 50 mensagens (chat/global e chat/guilda_<id>): enviar é 1
 * gravação e 1 leitura. Para gastar pouco do banco, o servidor guarda cada canal em memória por 5 segundos e o perfil
 * de cada jogador (nível, guilda, bloqueados) por 60 segundos; a tela pergunta de 5 em 5 segundos só com o painel
 * aberto e só traz o que é novo. O uid de quem escreveu nunca vai para a tela: bloquear e denunciar usam o id da mensagem.
 */

export class ErroDoChat extends Error {
  readonly status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = 'ErroDoChat';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Memória do servidor
// ---------------------------------------------------------------------------------------------------------------

const GUARDA_DO_CANAL_MS = 5_000;
const GUARDA_DO_PERFIL_MS = 60_000;
const MAXIMO_NA_MEMORIA = 5_000;

interface PerfilDoChat {
  em: number;
  nome: string;
  nivel: number;
  guildaId?: string;
  bloqueados: BloqueadoNoChat[];
}
const canais = new Map<string, { em: number; doc: CanalDocumento }>();
const perfis = new Map<string, PerfilDoChat>();

export function limparCacheDoChat(): void {
  canais.clear();
  perfis.clear();
}

async function lerCanal(id: string, agora: number): Promise<CanalDocumento> {
  const g = canais.get(id);
  if (g && agora - g.em < GUARDA_DO_CANAL_MS) return g.doc;
  const doc = (await repositorio.lerCanalDoChat(id)) ?? { id, mensagens: [] };
  if (canais.size >= MAXIMO_NA_MEMORIA) canais.clear();
  canais.set(id, { em: agora, doc });
  return doc;
}

/** Guarda o canal que acabou de ser gravado (vale na hora nesta instância). */
export function guardarCanal(doc: CanalDocumento, agora = Date.now()): void {
  if (canais.size >= MAXIMO_NA_MEMORIA) canais.clear();
  canais.set(doc.id, { em: agora, doc });
}

async function perfilDe(uid: string, agora: number): Promise<PerfilDoChat> {
  const g = perfis.get(uid);
  if (g && agora - g.em < GUARDA_DO_PERFIL_MS) return g;
  const c = await repositorio.lerPersonagem(uid);
  if (!c) throw new ErroDoChat('Personagem não encontrado.', 404);
  const perfil: PerfilDoChat = { em: agora, nome: c.nome, nivel: c.nivel, ...(c.guildaId ? { guildaId: c.guildaId } : {}), bloqueados: c.bloqueadosNoChat ?? [] };
  if (perfis.size >= MAXIMO_NA_MEMORIA) perfis.clear();
  perfis.set(uid, perfil);
  return perfil;
}

// ---------------------------------------------------------------------------------------------------------------
// Ler
// ---------------------------------------------------------------------------------------------------------------

export interface MensagemNaTela {
  id: string;
  nome: string;
  texto: string;
  em: string;
  minha: boolean;
}

export interface EstadoDoChat {
  canal: CanalDoChat;
  /** Os canais que o jogador pode abrir (Guilda só para quem está numa guilda). */
  canais: { id: CanalDoChat; nome: string; disponivel: boolean }[];
  /** Só as mensagens novas (depois da que a tela já tem), ou todas quando a tela não tem nenhuma. */
  mensagens: MensagemNaTela[];
  /** Os ids de todas as mensagens que o canal tem agora: a tela apaga as que sumiram (apagadas pelo Mestre). */
  ids: string[];
  podeEnviar: boolean;
  motivoSemEnvio: string | null;
  intervaloMs: number;
  textoMaximo: number;
  prazoDaDenunciaHoras: number;
  bloqueados: string[];
}

function motivoDoSilencio(ate: string, motivo: string): string {
  const quando = new Date(ate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  return `Você está silenciado no chat até ${quando} (horário de Brasília).${motivo ? ` Motivo: ${motivo}` : ''}`;
}

/** Por que o jogador não pode enviar agora neste canal (ou null se pode). */
async function motivoSemEnvio(uid: string, canal: CanalDoChat, perfil: PerfilDoChat, agora: Date): Promise<string | null> {
  const silencio = silencioEmVigor(await lerSancaoComCache(uid), agora);
  if (silencio) return motivoDoSilencio(silencio.ate, silencio.motivo);
  if (canal === 'global' && perfil.nivel < NIVEL_DO_CHAT_GLOBAL) return `O chat Global abre para falar no nível ${NIVEL_DO_CHAT_GLOBAL}.`;
  if (canal === 'guilda' && !perfil.guildaId) return 'Você não está numa guilda.';
  return null;
}

function idDoCanalDoJogador(canal: CanalDoChat, perfil: PerfilDoChat): string {
  if (canal === 'guilda' && !perfil.guildaId) throw new ErroDoChat('Você não está numa guilda.');
  return idDoCanal(canal, perfil.guildaId);
}

export async function estadoDoChat(uid: string, canalPedido: unknown, depois?: unknown, agora = new Date()): Promise<EstadoDoChat> {
  await exigirSistemaLigado(uid, 'chat');
  const canal: CanalDoChat = ehCanalDoChat(canalPedido) ? canalPedido : 'global';
  const perfil = await perfilDe(uid, agora.getTime());
  const doc = await lerCanal(idDoCanalDoJogador(canal, perfil), agora.getTime());
  const bloqueadosUids = new Set(perfil.bloqueados.map((b) => b.uid));
  const visiveis = doc.mensagens.filter((m) => !bloqueadosUids.has(m.uid));
  const i = typeof depois === 'string' ? visiveis.findIndex((m) => m.id === depois) : -1;
  const novas = i >= 0 ? visiveis.slice(i + 1) : visiveis;
  const semEnvio = await motivoSemEnvio(uid, canal, perfil, agora);
  return {
    canal,
    canais: [
      { id: 'global', nome: NOME_DO_CANAL.global, disponivel: true },
      { id: 'guilda', nome: NOME_DO_CANAL.guilda, disponivel: !!perfil.guildaId },
    ],
    mensagens: novas.map((m) => ({ id: m.id, nome: m.nome, texto: m.texto, em: m.em, minha: m.uid === uid })),
    ids: visiveis.map((m) => m.id),
    podeEnviar: !semEnvio,
    motivoSemEnvio: semEnvio,
    intervaloMs: INTERVALO_DO_CANAL_MS[canal],
    textoMaximo: TEXTO_MAXIMO_DO_CHAT,
    prazoDaDenunciaHoras: PRAZO_DA_DENUNCIA_HORAS,
    bloqueados: perfil.bloqueados.map((b) => b.nome),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Enviar
// ---------------------------------------------------------------------------------------------------------------

/** Envia uma mensagem. Devolve se o texto foi alterado pelo filtro (ofensas e links viram "***"). */
export async function enviarMensagem(uid: string, canalPedido: unknown, textoBruto: unknown, agora = new Date()): Promise<{ mensagem: MensagemNaTela; filtrada: boolean }> {
  await exigirSistemaLigado(uid, 'chat');
  if (!ehCanalDoChat(canalPedido)) throw new ErroDoChat('Escolha o canal.');
  const canal = canalPedido;
  const preparado = prepararTexto(textoBruto);
  if (!preparado) throw new ErroDoChat('Escreva uma mensagem.');
  const silencio = silencioEmVigor(await lerSancaoComCache(uid), agora);
  if (silencio) throw new ErroDoChat(motivoDoSilencio(silencio.ate, silencio.motivo), 403);
  const r = await repositorio.executarTransacao('chat:enviar', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (canal === 'global' && eu.nivel < NIVEL_DO_CHAT_GLOBAL) throw new ErroDoChat(`O chat Global abre para falar no nível ${NIVEL_DO_CHAT_GLOBAL}.`, 403);
    if (canal === 'guilda' && !eu.guildaId) throw new ErroDoChat('Você não está numa guilda.', 403);
    const id = idDoCanal(canal, eu.guildaId);
    const doc = (await ctx.lerCanalDoChat(id)) ?? { id, mensagens: [] };
    // o limite de velocidade vem das próprias mensagens do canal: vale em todas as instâncias, sem gravar nada a mais
    const minha = [...doc.mensagens].reverse().find((m) => m.uid === uid);
    const espera = minha ? INTERVALO_DO_CANAL_MS[canal] - (agora.getTime() - Date.parse(minha.em)) : 0;
    if (espera > 0) throw new ErroDoChat(`Espere ${Math.ceil(espera / 1000)} s para falar de novo.`, 429);
    const nova: MensagemDoChat = { id: `${agora.getTime().toString(36)}${randomUUID().replace(/-/g, '').slice(0, 8)}`, uid, nome: eu.nome, texto: preparado.texto, em: agora.toISOString() };
    const salvo = { id, mensagens: [...doc.mensagens, nova].slice(-MENSAGENS_POR_CANAL) };
    ctx.gravarCanalDoChat(salvo);
    return { salvo, nova };
  });
  guardarCanal(r.salvo, agora.getTime());
  return { mensagem: { id: r.nova.id, nome: r.nova.nome, texto: r.nova.texto, em: r.nova.em, minha: true }, filtrada: preparado.mudou };
}

// ---------------------------------------------------------------------------------------------------------------
// Bloquear e desbloquear
// ---------------------------------------------------------------------------------------------------------------

async function acharMensagem(uid: string, canalPedido: unknown, mensagemId: unknown, agora: Date): Promise<{ doc: CanalDocumento; indice: number }> {
  if (!ehCanalDoChat(canalPedido) || typeof mensagemId !== 'string') throw new ErroDoChat('Escolha a mensagem.');
  const perfil = await perfilDe(uid, agora.getTime());
  const doc = await lerCanal(idDoCanalDoJogador(canalPedido, perfil), agora.getTime());
  const indice = doc.mensagens.findIndex((m) => m.id === mensagemId);
  if (indice < 0) throw new ErroDoChat('Essa mensagem já saiu do chat.', 404);
  return { doc, indice };
}

export async function bloquearAutor(uid: string, canalPedido: unknown, mensagemId: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'chat');
  const { doc, indice } = await acharMensagem(uid, canalPedido, mensagemId, agora);
  const alvo = doc.mensagens[indice];
  if (alvo.uid === uid) throw new ErroDoChat('Você não pode bloquear a si mesmo.');
  const r = await repositorio.executarTransacao('chat:bloquear', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const lista = eu.bloqueadosNoChat ?? [];
    if (lista.some((b) => b.uid === alvo.uid)) throw new ErroDoChat(`${alvo.nome} já está bloqueado.`, 409);
    if (lista.length >= BLOQUEADOS_MAXIMOS) throw new ErroDoChat(`Você já bloqueou ${BLOQUEADOS_MAXIMOS} jogadores. Desbloqueie alguém antes.`, 409);
    const nova = [...lista, { uid: alvo.uid, nome: alvo.nome }];
    salvarPersonagem(ctx, eu, { bloqueadosNoChat: nova });
    return nova;
  });
  const p = perfis.get(uid);
  if (p) p.bloqueados = r;
  return { mensagem: `${alvo.nome} foi bloqueado: você não vê mais as mensagens dessa pessoa.` };
}

export async function desbloquearPorNome(uid: string, nomeBruto: unknown): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'chat');
  const nome = typeof nomeBruto === 'string' ? nomeBruto : '';
  const r = await repositorio.executarTransacao('chat:desbloquear', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const lista = eu.bloqueadosNoChat ?? [];
    if (!lista.some((b) => b.nome === nome)) throw new ErroDoChat('Esse jogador não está na sua lista de bloqueados.', 404);
    const nova = lista.filter((b) => b.nome !== nome);
    salvarPersonagem(ctx, eu, { bloqueadosNoChat: nova.length ? nova : undefined });
    return nova;
  });
  const p = perfis.get(uid);
  if (p) p.bloqueados = r;
  return { mensagem: `${nome} foi desbloqueado.` };
}

// ---------------------------------------------------------------------------------------------------------------
// Denunciar
// ---------------------------------------------------------------------------------------------------------------

const PONTA = (texto: string) => (texto.length > 120 ? `${texto.slice(0, 117)}...` : texto);

/**
 * A denúncia vai para a fila de revisão do Painel (o sinal "denunciaDeChat") com a mensagem e as anteriores. O mesmo
 * jogador denunciado na mesma hora é uma entrada só (o id é por jogador e hora): a mais recente fica.
 */
export async function denunciarMensagem(uid: string, canalPedido: unknown, mensagemId: unknown, agora = new Date()): Promise<{ mensagem: string }> {
  await exigirSistemaLigado(uid, 'chat');
  const { doc, indice } = await acharMensagem(uid, canalPedido, mensagemId, agora);
  const alvo = doc.mensagens[indice];
  if (alvo.uid === uid) throw new ErroDoChat('Você não pode denunciar a si mesmo.');
  const perfil = await perfilDe(uid, agora.getTime());
  const contexto = doc.mensagens.slice(Math.max(0, indice - CONTEXTO_DA_DENUNCIA), indice + 1);
  const canalNome = NOME_DO_CANAL[canalPedido as CanalDoChat];
  const entrada: EntradaDeRevisao = {
    id: idDaRevisao(alvo.uid, horaDe(agora), 'denunciaDeChat'),
    uid: alvo.uid,
    nome: alvo.nome,
    tipo: 'denunciaDeChat',
    descricao: `Denunciado por ${perfil.nome} no chat ${canalNome} (canal ${doc.id}). Mensagem ${alvo.id}: "${PONTA(alvo.texto)}". Contexto: ${contexto.map((m) => `${m.nome}: ${PONTA(m.texto)}`).join(' | ')}`.slice(0, 1500),
    criadaEm: agora.toISOString(),
    revisada: false,
  };
  await repositorio.gravarRevisao(entrada);
  return { mensagem: `Denúncia enviada. A equipe responde em até ${PRAZO_DA_DENUNCIA_HORAS} horas.` };
}

/** Exclusão da conta (LGPD): tira do Global e do canal da guilda as mensagens que o jogador ainda tem lá. */
export async function apagarMensagensDoJogador(uid: string, guildaId?: string): Promise<void> {
  for (const id of ['global', ...(guildaId ? [idDoCanal('guilda', guildaId)] : [])]) {
    const atual = await repositorio.lerCanalDoChat(id);
    if (!atual?.mensagens.some((m) => m.uid === uid)) continue;
    const novo = await repositorio.executarTransacao('chat:apagarDoJogador', async (ctx) => {
      const doc = (await ctx.lerCanalDoChat(id)) ?? { id, mensagens: [] };
      const salvo = { id, mensagens: doc.mensagens.filter((m) => m.uid !== uid) };
      ctx.gravarCanalDoChat(salvo);
      return salvo;
    });
    guardarCanal(novo);
  }
}
