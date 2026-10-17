import { configuracaoDoDocumento, configuracaoPadrao, mensagemDaManutencao, mensagemDoSistema, type ConfiguracaoDeSistemas, type SistemaId } from '@/rules/sistemas';
import { ErroManutencao, ErroSistemaDesligado } from '@/server/errosDeSistema';
import { registrarLog } from '@/server/log';
import { repositorio } from '@/server/persistencia';

/**
 * Lado de leitura dos sistemas (3.5.5.2): o que as rotas do jogo consultam a cada pedido. A configuração fica em
 * cache por pouco tempo; na instância que mudou ela vale na hora, nas outras em até TTL_CACHE_SISTEMAS_MS.
 * Se o banco falhar, o jogo segue aberto (falhar fechado derrubaria o jogo por causa do próprio painel).
 */
export const TTL_CACHE_SISTEMAS_MS = 10_000;
const TTL_APOS_ERRO_MS = 5_000;

let cache: { config: ConfiguracaoDeSistemas; expiraEm: number } | null = null;

export function guardarConfiguracaoNoCache(config: ConfiguracaoDeSistemas): void {
  cache = { config, expiraEm: Date.now() + TTL_CACHE_SISTEMAS_MS };
}

/** Só para testes. */
export function limparCacheDeSistemas(): void {
  cache = null;
}

export async function lerConfiguracaoDeSistemas(): Promise<ConfiguracaoDeSistemas> {
  if (cache && cache.expiraEm > Date.now()) return cache.config;
  try {
    const doc = await repositorio.lerConfiguracaoDeSistemas();
    const config = doc ? configuracaoDoDocumento(doc) : configuracaoPadrao();
    guardarConfiguracaoNoCache(config);
    return config;
  } catch (error) {
    registrarLog('WARNING', 'sistemas.leitura_falhou', { mensagem: error instanceof Error ? error.message : 'desconhecido' });
    const anterior = cache?.config ?? configuracaoPadrao();
    cache = { config: anterior, expiraEm: Date.now() + TTL_APOS_ERRO_MS };
    return anterior;
  }
}

/** Quem tem papel no painel (Dono, Mestre, Moderador ou Suporte) passa mesmo com o jogo fechado. */
async function temPapelNoPainel(uid: string): Promise<boolean> {
  const { donosDoAmbiente, papelDoUsuario } = await import('@/server/mestre'); // import tardio: mestre.ts usa a autenticação
  return donosDoAmbiente().has(uid) || (await papelDoUsuario(uid)) !== null;
}

/** Lança ErroManutencao se o jogo está em manutenção e o usuário não tem papel no painel. */
export async function exigirJogoAberto(uid: string): Promise<void> {
  const config = await lerConfiguracaoDeSistemas();
  if (!config.manutencao.ativa) return;
  if (await temPapelNoPainel(uid)) return;
  throw new ErroManutencao(mensagemDaManutencao(config));
}

/** Lança ErroSistemaDesligado se o sistema está desligado e o usuário não tem papel no painel. */
export async function exigirSistemaLigado(uid: string, sistema: SistemaId): Promise<void> {
  const config = await lerConfiguracaoDeSistemas();
  if (config.sistemas[sistema].ativo) return;
  if (await temPapelNoPainel(uid)) return;
  throw new ErroSistemaDesligado(sistema, mensagemDoSistema(config, sistema));
}
