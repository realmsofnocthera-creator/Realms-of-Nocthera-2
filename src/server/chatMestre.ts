import { duracaoDoSilencio, ID_DE_CANAL_VALIDO, SILENCIOS, type MensagemDoChat } from '@/rules/chat';
import { sancaoDocumentoVazio, silencioEmVigor, type SilencioNoChat } from '@/rules/sancoes';
import { guardarCanal } from '@/server/chat';
import { comRegistro, donosDoAmbiente, ErroMestre, exigir, motivoValido, papelDoUsuario, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { atualizarCacheDeSancao } from '@/server/sancoes';

/**
 * Moderação do chat (7.7, decidida pelo Yuri em 26/10/2026). Ver os canais é de quem lê jogadores; apagar mensagem e
 * silenciar (1 hora, 24 horas ou 7 dias) é de quem pode sancionar (Moderador e Dono). O motivo é obrigatório e tudo
 * fica no log, gravado antes da mudança. Não há silêncio automático: só uma pessoa da equipe decide.
 */

const ID_VALIDO = /^[a-zA-Z0-9_-]{1,128}$/;

export interface CanalParaOMestre {
  canal: string;
  mensagens: (MensagemDoChat & { silenciado: boolean })[];
}

const idDoCanalValido = (canal: unknown): string => {
  if (typeof canal !== 'string' || !ID_DE_CANAL_VALIDO.test(canal)) throw new ErroMestre(400, 'Escolha o canal: "global" ou "guilda_<id da guilda>".');
  return canal;
};

/** As mensagens de um canal (com o identificador de quem escreveu) e quem delas está silenciado agora. */
export async function lerCanalDoMestre(sessao: SessaoMestre, canalBruto: unknown): Promise<CanalParaOMestre> {
  exigir(sessao, 'jogadores.ler');
  const canal = idDoCanalValido(canalBruto ?? 'global');
  const doc = (await repositorio.lerCanalDoChat(canal)) ?? { id: canal, mensagens: [] };
  const agora = new Date();
  const autores = [...new Set(doc.mensagens.map((m) => m.uid))];
  const silenciados = new Set((await Promise.all(autores.map(async (u) => ((silencioEmVigor(await repositorio.lerSancao(u), agora) ? u : null))))).filter((u): u is string => !!u));
  return { canal, mensagens: doc.mensagens.map((m) => ({ ...m, silenciado: silenciados.has(m.uid) })).reverse() };
}

export async function apagarMensagemDoMestre(sessao: SessaoMestre, pedido: { canal?: unknown; mensagem?: unknown; motivo?: unknown }, ip?: string): Promise<{ mensagem: string }> {
  exigir(sessao, 'jogadores.sancionar');
  const canal = idDoCanalValido(pedido.canal);
  const id = typeof pedido.mensagem === 'string' && /^[A-Za-z0-9]{1,40}$/.test(pedido.mensagem) ? pedido.mensagem : '';
  if (!id) throw new ErroMestre(400, 'Escolha a mensagem.');
  const motivo = motivoValido(pedido.motivo);
  const atual = (await repositorio.lerCanalDoChat(canal))?.mensagens.find((m) => m.id === id);
  if (!atual) throw new ErroMestre(404, 'Essa mensagem já saiu do chat.');
  await comRegistro(sessao, { acao: 'chat.apagar', alvo: atual.uid, antes: { canal, mensagem: id, nome: atual.nome, texto: atual.texto }, motivo, ip }, async () => {
    const novo = await repositorio.executarTransacao('chat:apagar', async (ctx) => {
      const doc = (await ctx.lerCanalDoChat(canal)) ?? { id: canal, mensagens: [] };
      const salvo = { id: canal, mensagens: doc.mensagens.filter((m) => m.id !== id) };
      ctx.gravarCanalDoChat(salvo);
      return salvo;
    });
    guardarCanal(novo);
  });
  return { mensagem: `A mensagem de ${atual.nome} foi apagada.` };
}

async function alvoValido(sessao: SessaoMestre, uidBruto: unknown): Promise<string> {
  if (typeof uidBruto !== 'string' || !ID_VALIDO.test(uidBruto)) throw new ErroMestre(400, 'Informe o identificador (uid) do jogador.');
  if (uidBruto === sessao.uid) throw new ErroMestre(400, 'Você não pode silenciar a si mesmo.');
  if (donosDoAmbiente().has(uidBruto) || (await papelDoUsuario(uidBruto))) throw new ErroMestre(400, 'Esse jogador tem papel no painel. Tire o papel dele antes de silenciar.');
  if (!(await repositorio.lerPersonagem(uidBruto))) throw new ErroMestre(404, 'Nenhum jogador com esse identificador.');
  return uidBruto;
}

/** Silencia o jogador no chat por 1 hora, 24 horas ou 7 dias (um novo silêncio troca o que estiver valendo). */
export async function silenciarNoChat(sessao: SessaoMestre, pedido: { uid?: unknown; duracao?: unknown; motivo?: unknown }, ip?: string): Promise<{ mensagem: string; ate: string }> {
  exigir(sessao, 'jogadores.sancionar');
  const duracao = duracaoDoSilencio(pedido.duracao);
  if (!duracao) throw new ErroMestre(400, `Escolha a duração: ${SILENCIOS.map((s) => s.nome).join(', ')}.`);
  const motivo = motivoValido(pedido.motivo);
  const uid = await alvoValido(sessao, pedido.uid);
  const agora = new Date();
  const atual = (await repositorio.lerSancao(uid)) ?? sancaoDocumentoVazio(uid);
  const silencio: SilencioNoChat = { ate: new Date(agora.getTime() + duracao.ms).toISOString(), motivo, aplicadoPor: sessao.uid, aplicadoEm: agora.toISOString() };
  const proximo = { ...atual, silencioNoChat: silencio };
  await comRegistro(sessao, { acao: 'chat.silenciar', alvo: uid, antes: { silenciadoAte: silencioEmVigor(atual, agora)?.ate ?? null }, depois: { silenciadoAte: silencio.ate, duracao: duracao.id }, motivo, ip }, () => repositorio.gravarSancao(proximo));
  atualizarCacheDeSancao(proximo);
  return { mensagem: `Silenciado no chat por ${duracao.nome}.`, ate: silencio.ate };
}

export async function tirarSilencioDoChat(sessao: SessaoMestre, pedido: { uid?: unknown; motivo?: unknown }, ip?: string): Promise<{ mensagem: string }> {
  exigir(sessao, 'jogadores.sancionar');
  const motivo = motivoValido(pedido.motivo);
  const uid = await alvoValido(sessao, pedido.uid);
  const atual = (await repositorio.lerSancao(uid)) ?? sancaoDocumentoVazio(uid);
  if (!silencioEmVigor(atual, new Date())) throw new ErroMestre(400, 'Esse jogador não está silenciado.');
  const proximo = { ...atual, silencioNoChat: null };
  await comRegistro(sessao, { acao: 'chat.tirarSilencio', alvo: uid, antes: { silenciadoAte: atual.silencioNoChat?.ate ?? null }, depois: { silenciadoAte: null }, motivo, ip }, () => repositorio.gravarSancao(proximo));
  atualizarCacheDeSancao(proximo);
  return { mensagem: 'O silêncio no chat foi levantado.' };
}
