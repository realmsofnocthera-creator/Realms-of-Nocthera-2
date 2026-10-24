import { mensagemDaSancao, sancaoEmVigor, type SancaoDocumento, type SancaoEmVigor } from '@/rules/sancoes';
import { repositorio } from '@/server/persistencia';

/**
 * Conta sancionada (3.5.4.3). Quem está suspenso ou banido não passa da autenticação: a checagem fica em
 * verifyAuthToken, que todas as rotas já usam, então vale para o jogo inteiro e para o painel.
 *
 * A leitura vai para o Firestore no máximo uma vez a cada TTL_CACHE_SANCOES_MS por jogador. Na instância que
 * aplicou a sanção ela vale na hora; nas outras, em até esse tempo (o mesmo limite do cache de logout).
 */
export const TTL_CACHE_SANCOES_MS = 30_000;
const MAX_ENTRADAS_CACHE = 10_000;
const cache = new Map<string, { doc: SancaoDocumento | null; expiraEm: number }>();

/** A conta está sancionada: as rotas respondem 403 com o motivo (ver respostaErroPersistencia). */
export class ErroContaSancionada extends Error {
  readonly status = 403;

  constructor(readonly sancao: SancaoEmVigor) {
    super(mensagemDaSancao(sancao));
    this.name = 'ErroContaSancionada';
  }
}

/** Só para testes: esquece o cache. */
export function limparCacheDeSancoes(): void {
  cache.clear();
  limitadosEmCache = null;
}

/** Guarda no cache (usado por quem acabou de gravar uma sanção). */
export function atualizarCacheDeSancao(doc: SancaoDocumento): void {
  if (cache.size >= MAX_ENTRADAS_CACHE) cache.clear();
  cache.set(doc.uid, { doc, expiraEm: Date.now() + TTL_CACHE_SANCOES_MS });
}

export async function lerSancaoComCache(uid: string): Promise<SancaoDocumento | null> {
  const emCache = cache.get(uid);
  if (emCache && emCache.expiraEm > Date.now()) return emCache.doc;
  const doc = await repositorio.lerSancao(uid);
  if (cache.size >= MAX_ENTRADAS_CACHE) cache.clear();
  cache.set(uid, { doc, expiraEm: Date.now() + TTL_CACHE_SANCOES_MS });
  return doc;
}

/** Lança ErroContaSancionada se a conta está suspensa ou banida agora. */
export async function exigirContaLivre(uid: string): Promise<void> {
  const vigor = sancaoEmVigor(await lerSancaoComCache(uid), new Date());
  if (vigor) throw new ErroContaSancionada(vigor);
}

// ---------------------------------------------------------------------------------------------------------------
// Limite silencioso (6.5-7): fora dos rankings e só a recompensa mínima dos chefes, sem o jogador saber
// ---------------------------------------------------------------------------------------------------------------

/** A conta está com limite silencioso? Usa o mesmo cache da checagem de sanção (que o login já leu). */
export async function comLimiteSilencioso(uid: string): Promise<boolean> {
  return !!(await lerSancaoComCache(uid))?.limiteSilencioso;
}

let limitadosEmCache: { em: number; uids: Set<string> } | null = null;

/** Os uids com limite silencioso, para tirar dos rankings (lido no máximo uma vez por TTL). */
export async function uidsComLimiteSilencioso(agora = Date.now()): Promise<Set<string>> {
  if (limitadosEmCache && agora - limitadosEmCache.em < TTL_CACHE_SANCOES_MS) return limitadosEmCache.uids;
  const uids = new Set(await repositorio.listarComLimiteSilencioso());
  limitadosEmCache = { em: agora, uids };
  return uids;
}

/** Quem acabou de mudar o limite: a lista é lida de novo na próxima vez. */
export function esquecerLimitados(): void {
  limitadosEmCache = null;
}
