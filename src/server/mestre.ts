import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { verifyAuthToken, type AuthenticatedUser } from '@/server/auth';
import { repositorio, type EntradaLogAdmin } from '@/server/persistencia';
import { respostaErroPersistencia } from '@/server/respostaErro';
import {
  ehPapelMestre,
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  papelTem,
  type PapelMestre,
  type PermissaoMestre,
} from '@/rules/mestre';

/**
 * Autorização e log do Painel do Mestre (3.5.1 e 3.5.5.1). Toda rota administrativa passa por `exigirPermissao`:
 * quem decide é sempre o servidor; esconder um botão na tela não conta como proteção.
 *
 * O Dono vem da variável de ambiente MESTRE_DONO_UIDS (uids separados por vírgula). Os outros papéis são concedidos
 * pelo Dono no painel e ficam em mestres/{uid}. Sem a variável, ninguém é Dono e o painel fica fechado.
 */

export class ErroMestre extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409,
    mensagem: string
  ) {
    super(mensagem);
  }
}

const ID_VALIDO = /^[a-zA-Z0-9_-]{1,128}$/;

/** Donos registrados no código do projeto (uids do Firebase Auth; não são segredo). Somam-se aos da variável de ambiente. */
export const DONOS_DO_PROJETO: readonly string[] = ['MDET0IAPXDYTPWy0TdvUlyyhQpa2'];

/** Os uids dos Donos: os do projeto mais os da variável MESTRE_DONO_UIDS, lida a cada chamada. */
export function donosDoAmbiente(): ReadonlySet<string> {
  const bruto = process.env.MESTRE_DONO_UIDS ?? '';
  const doAmbiente = bruto.split(',').map((s) => s.trim());
  return new Set([...DONOS_DO_PROJETO, ...doAmbiente].filter((s) => ID_VALIDO.test(s)));
}

export interface SessaoMestre {
  uid: string;
  email: string;
  papel: PapelMestre;
  /** `ambiente`: o Dono, que não se altera pelo painel. */
  origem: 'ambiente' | 'painel';
}

/** O papel do usuário no painel, ou null se ele não tem nenhum. Um "dono" gravado no banco é ignorado. */
export async function papelDoUsuario(uid: string): Promise<{ papel: PapelMestre; origem: 'ambiente' | 'painel' } | null> {
  if (donosDoAmbiente().has(uid)) return { papel: 'dono', origem: 'ambiente' };
  const doc = await repositorio.lerPapelMestre(uid);
  if (!doc || !ehPapelMestre(doc.papel) || doc.papel === 'dono') return null;
  return { papel: doc.papel, origem: 'painel' };
}

/** Confere só o login. Sem token válido, 401. */
export async function identificar(authHeader: string | null): Promise<AuthenticatedUser> {
  const user = await verifyAuthToken(authHeader);
  if (!user) throw new ErroMestre(401, 'Não autorizado. Faça login para entrar no painel.');
  return user;
}

/** Login, papel e permissão: 401 sem login, 403 sem papel ou sem a permissão. */
export async function exigirPermissao(authHeader: string | null, permissao: PermissaoMestre): Promise<SessaoMestre> {
  const user = await identificar(authHeader);
  const papel = await papelDoUsuario(user.uid);
  if (!papel) throw new ErroMestre(403, 'Acesso restrito aos Mestres.');
  if (!papelTem(papel.papel, permissao)) throw new ErroMestre(403, 'Seu papel não permite esta ação.');
  return { uid: user.uid, email: user.email, papel: papel.papel, origem: papel.origem };
}

// ---- log administrativo ----

export interface DadosDaAcao {
  acao: string;
  alvo?: string;
  antes?: unknown;
  depois?: unknown;
  motivo?: string;
  ip?: string;
}

function entradaDoLog(sessao: SessaoMestre, dados: DadosDaAcao): EntradaLogAdmin {
  return {
    id: randomUUID(),
    criadoEm: new Date().toISOString(),
    uid: sessao.uid,
    email: sessao.email,
    papel: sessao.papel,
    acao: dados.acao,
    ...(dados.alvo !== undefined ? { alvo: dados.alvo } : {}),
    ...(dados.antes !== undefined ? { antes: dados.antes } : {}),
    ...(dados.depois !== undefined ? { depois: dados.depois } : {}),
    ...(dados.motivo !== undefined ? { motivo: dados.motivo } : {}),
    ...(dados.ip !== undefined ? { ip: dados.ip } : {}),
  };
}

/**
 * Nenhuma ação sem registro: o log é gravado ANTES da mudança, e se o log falhar a mudança não acontece.
 * Se a mudança falhar depois, um segundo registro "<ação>.falhou" deixa isso escrito.
 */
export async function comRegistro<T>(sessao: SessaoMestre, dados: DadosDaAcao, aplicar: () => Promise<T>): Promise<T> {
  await repositorio.registrarLogAdmin(entradaDoLog(sessao, dados));
  try {
    return await aplicar();
  } catch (error) {
    try {
      await repositorio.registrarLogAdmin(entradaDoLog(sessao, { ...dados, acao: `${dados.acao}.falhou` }));
    } catch {
      // o erro original é o que importa para quem chamou
    }
    throw error;
  }
}

export function motivoValido(motivo: unknown): string {
  const texto = typeof motivo === 'string' ? motivo.trim() : '';
  if (texto.length < MOTIVO_MINIMO || texto.length > MOTIVO_MAXIMO) {
    throw new ErroMestre(400, `Escreva o motivo (de ${MOTIVO_MINIMO} a ${MOTIVO_MAXIMO} caracteres).`);
  }
  return texto;
}

const ERRO_SEM_PERMISSAO = 'Seu papel não permite esta ação.';
export function exigir(sessao: SessaoMestre, permissao: PermissaoMestre): void {
  if (!papelTem(sessao.papel, permissao)) throw new ErroMestre(403, ERRO_SEM_PERMISSAO);
}

// ---- papéis ----

export interface PapelListado {
  uid: string;
  nome: string | null;
  papel: PapelMestre;
  origem: 'ambiente' | 'painel';
  concedidoPor: string | null;
  concedidoEm: string | null;
  motivo: string | null;
}

export async function listarPapeis(sessao: SessaoMestre): Promise<PapelListado[]> {
  exigir(sessao, 'papeis.gerir');
  const nomeDe = async (uid: string) => (await repositorio.lerPersonagem(uid))?.nome ?? null;
  const donos = await Promise.all(
    [...donosDoAmbiente()].map(async (uid): Promise<PapelListado> => ({
      uid, nome: await nomeDe(uid), papel: 'dono', origem: 'ambiente', concedidoPor: null, concedidoEm: null, motivo: null,
    }))
  );
  const doBanco = (await repositorio.listarPapeisMestre()).filter((p) => p.papel !== 'dono' && !donosDoAmbiente().has(p.uid));
  const mestres = await Promise.all(
    doBanco.map(async (p): Promise<PapelListado> => ({
      uid: p.uid, nome: await nomeDe(p.uid), papel: p.papel, origem: 'painel', concedidoPor: p.concedidoPor, concedidoEm: p.concedidoEm, motivo: p.motivo,
    }))
  );
  return [...donos, ...mestres.sort((a, b) => (a.concedidoEm ?? '').localeCompare(b.concedidoEm ?? ''))];
}

export interface PedidoDePapel {
  uidAlvo: unknown;
  papel: unknown;
  motivo: unknown;
}

function conferirAlvo(sessao: SessaoMestre, uidAlvo: unknown): string {
  if (typeof uidAlvo !== 'string' || !ID_VALIDO.test(uidAlvo)) throw new ErroMestre(400, 'Informe o identificador (uid) do jogador.');
  if (uidAlvo === sessao.uid) throw new ErroMestre(400, 'Você não pode mudar o seu próprio papel.');
  if (donosDoAmbiente().has(uidAlvo)) throw new ErroMestre(400, 'O Dono vem do ambiente do servidor e não se altera pelo painel.');
  return uidAlvo;
}

/** Dá (ou troca) o papel de um jogador. "Dono" não se concede pelo painel. */
export async function concederPapel(sessao: SessaoMestre, pedido: PedidoDePapel, ip?: string): Promise<void> {
  exigir(sessao, 'papeis.gerir');
  const uidAlvo = conferirAlvo(sessao, pedido.uidAlvo);
  if (!ehPapelMestre(pedido.papel)) throw new ErroMestre(400, 'Escolha um papel válido.');
  if (pedido.papel === 'dono') throw new ErroMestre(400, 'O papel de Dono vem do ambiente do servidor (MESTRE_DONO_UIDS).');
  const motivo = motivoValido(pedido.motivo);
  if (!(await repositorio.lerPersonagem(uidAlvo))) throw new ErroMestre(404, 'Nenhum jogador com esse identificador.');
  const antes = (await repositorio.lerPapelMestre(uidAlvo))?.papel ?? null;
  const papel = pedido.papel;
  await comRegistro(sessao, { acao: 'papel.conceder', alvo: uidAlvo, antes: { papel: antes }, depois: { papel }, motivo, ip }, () =>
    repositorio.gravarPapelMestre({ uid: uidAlvo, papel, concedidoPor: sessao.uid, concedidoEm: new Date().toISOString(), motivo })
  );
}

/** Tira o papel de um jogador. */
export async function revogarPapel(sessao: SessaoMestre, pedido: Omit<PedidoDePapel, 'papel'>, ip?: string): Promise<void> {
  exigir(sessao, 'papeis.gerir');
  const uidAlvo = conferirAlvo(sessao, pedido.uidAlvo);
  const motivo = motivoValido(pedido.motivo);
  const atual = await repositorio.lerPapelMestre(uidAlvo);
  if (!atual) throw new ErroMestre(404, 'Esse jogador não tem papel no painel.');
  await comRegistro(sessao, { acao: 'papel.revogar', alvo: uidAlvo, antes: { papel: atual.papel }, depois: { papel: null }, motivo, ip }, () =>
    repositorio.removerPapelMestre(uidAlvo)
  );
}

// ---- log ----

export const LIMITE_PADRAO_DO_LOG = 50;
export const LIMITE_MAXIMO_DO_LOG = 200;

export async function listarLog(sessao: SessaoMestre, limite?: unknown): Promise<EntradaLogAdmin[]> {
  exigir(sessao, 'log.ler');
  const n = Math.floor(Number(limite));
  const efetivo = Number.isFinite(n) && n > 0 ? Math.min(n, LIMITE_MAXIMO_DO_LOG) : LIMITE_PADRAO_DO_LOG;
  return repositorio.listarLogAdmin(efetivo);
}

/** Resposta HTTP para os erros das rotas do painel (ErroMestre ou falha do banco); null se for outro erro. */
export function respostaErroMestre(error: unknown): NextResponse | null {
  if (error instanceof ErroMestre) return NextResponse.json({ error: error.message }, { status: error.status });
  return respostaErroPersistencia(error);
}
