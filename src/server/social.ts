import { CAMPO_DO_RANKING, chaveDeBusca, CRITERIOS_DE_RANKING, LEITURA_DA_BUSCA, LEITURA_DO_RANKING, LIMITE_DA_BUSCA, montarRanking, PREFIXO_MAXIMO_DA_BUSCA, PREFIXO_MINIMO_DA_BUSCA, VALIDADE_DO_RANKING_MS, type CriterioDeRanking, type EntradaDoRanking, type RankingGuardado, type ResumoDePersonagem } from '@/rules/social';
import { getCharacterByUid, updateCharacter } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';
import { uidsComLimiteSilencioso } from '@/server/sancoes';

/**
 * Social (7.1). O ranking NÃO é calculado a cada visita: há um retrato por ranking no banco (ranking/{critério}),
 * renovado só quando passou de 30 minutos e alguém abre o ranking. Assim o custo no Firestore tem teto fixo (até 150
 * leituras por ranking a cada 30 minutos, em qualquer número de visitas ou de instâncias do servidor) e as visitas
 * normais leem um documento só, ainda guardado por 1 minuto na memória do servidor.
 */
const GUARDA_NA_MEMORIA_MS = 60_000;
const memoria = new Map<CriterioDeRanking, { em: number; ranking: RankingGuardado }>();

export function limparCacheDoRanking(): void {
  memoria.clear();
}

async function montarERegravar(criterio: CriterioDeRanking, agora: Date): Promise<RankingGuardado> {
  const [lidos, limitados] = await Promise.all([repositorio.consultarTopo(CAMPO_DO_RANKING[criterio], LEITURA_DO_RANKING), uidsComLimiteSilencioso()]);
  // Limite silencioso (6.5-7): quem está com ele não entra no ranking
  const entradas = montarRanking(lidos.filter((l) => !l.uid || !limitados.has(l.uid)));
  const ranking: RankingGuardado = { criterio, atualizadoEm: agora.toISOString(), entradas };
  try {
    await repositorio.gravarRanking(ranking);
  } catch {
    // o retrato não foi guardado: vale para esta visita e a próxima tenta de novo
  }
  return ranking;
}

/** O ranking pedido: do retrato guardado, renovado se tiver mais de 30 minutos (ou se nunca foi montado). */
export async function lerRanking(criterio: CriterioDeRanking, agora = new Date()): Promise<RankingGuardado> {
  const guardado = memoria.get(criterio);
  if (guardado && agora.getTime() - guardado.em < GUARDA_NA_MEMORIA_MS) return guardado.ranking;
  let ranking = await repositorio.lerRanking(criterio);
  if (!ranking || agora.getTime() - Date.parse(ranking.atualizadoEm) >= VALIDADE_DO_RANKING_MS || Number.isNaN(Date.parse(ranking.atualizadoEm))) {
    ranking = await montarERegravar(criterio, agora);
  }
  memoria.set(criterio, { em: agora.getTime(), ranking });
  return ranking;
}

export interface RespostaDoRanking {
  criterio: CriterioDeRanking;
  atualizadoEm: string;
  entradas: EntradaDoRanking[];
  /** A posição de quem pediu, se está no top; senão null (ou escondido: o ranking não o mostra). */
  minhaPosicao: number | null;
  /** Quem pediu escolheu não aparecer no ranking. */
  estouEscondido: boolean;
}

export async function rankingParaJogador(uid: string, criterio: CriterioDeRanking): Promise<RespostaDoRanking> {
  const [ranking, eu] = await Promise.all([lerRanking(criterio), getCharacterByUid(uid)]);
  if (!eu) throw new Error('Personagem não encontrado.');
  const minha = ranking.entradas.find((e) => e.nome === eu.nome);
  return { criterio, atualizadoEm: ranking.atualizadoEm, entradas: ranking.entradas, minhaPosicao: eu.escondidoNoRanking ? null : (minha?.posicao ?? null), estouEscondido: eu.escondidoNoRanking === true };
}

export class ErroDeBusca extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeBusca';
  }
}

export interface ResultadoDaBusca {
  nome: string;
  avatarId: string;
  classeId: string;
  racaId: string;
  nivel: number;
}

/** Personagens cujo nome começa com o texto, em ordem alfabética, sem os que se esconderam (e sem o próprio jogador). */
export async function buscarJogadores(uid: string, texto: unknown): Promise<ResultadoDaBusca[]> {
  const prefixo = typeof texto === 'string' ? chaveDeBusca(texto) : '';
  if (prefixo.length < PREFIXO_MINIMO_DA_BUSCA) throw new ErroDeBusca(`Digite pelo menos ${PREFIXO_MINIMO_DA_BUSCA} letras do nome.`);
  if (prefixo.length > PREFIXO_MAXIMO_DA_BUSCA) throw new ErroDeBusca('Esse nome é longo demais.');
  const [lidos, eu] = await Promise.all([repositorio.buscarPorPrefixo(prefixo, LEITURA_DA_BUSCA), getCharacterByUid(uid)]);
  const meuNome = eu ? chaveDeBusca(eu.nome) : '';
  return lidos
    .filter((c: ResumoDePersonagem) => !c.escondidoNaBusca && chaveDeBusca(c.nome) !== meuNome)
    .slice(0, LIMITE_DA_BUSCA)
    .map((c) => ({ nome: c.nome, avatarId: c.avatarId, classeId: c.classeId, racaId: c.racaId, nivel: c.nivel }));
}

export interface PrivacidadeSocial {
  escondidoNoRanking: boolean;
  escondidoNaBusca: boolean;
}

export async function lerPrivacidade(uid: string): Promise<PrivacidadeSocial> {
  const eu = await getCharacterByUid(uid);
  if (!eu) throw new Error('Personagem não encontrado.');
  return { escondidoNoRanking: eu.escondidoNoRanking === true, escondidoNaBusca: eu.escondidoNaBusca === true };
}

/** Muda o que o jogador mostra. Só grava se algo mudou. Quem se esconde do ranking sai já dos retratos em que aparece. */
export async function definirPrivacidade(uid: string, pedido: { escondidoNoRanking?: unknown; escondidoNaBusca?: unknown }): Promise<PrivacidadeSocial> {
  const eu = await getCharacterByUid(uid);
  if (!eu) throw new Error('Personagem não encontrado.');
  const atual: PrivacidadeSocial = { escondidoNoRanking: eu.escondidoNoRanking === true, escondidoNaBusca: eu.escondidoNaBusca === true };
  const proxima: PrivacidadeSocial = {
    escondidoNoRanking: typeof pedido.escondidoNoRanking === 'boolean' ? pedido.escondidoNoRanking : atual.escondidoNoRanking,
    escondidoNaBusca: typeof pedido.escondidoNaBusca === 'boolean' ? pedido.escondidoNaBusca : atual.escondidoNaBusca,
  };
  if (proxima.escondidoNoRanking === atual.escondidoNoRanking && proxima.escondidoNaBusca === atual.escondidoNaBusca) return proxima;
  await updateCharacter(uid, proxima);
  if (proxima.escondidoNoRanking && !atual.escondidoNoRanking) {
    // refaz só os retratos em que o nome aparece (poucas leituras, e só quando alguém se esconde)
    for (const criterio of CRITERIOS_DE_RANKING) {
      const guardado = await repositorio.lerRanking(criterio);
      if (guardado?.entradas.some((e) => e.nome === eu.nome)) await montarERegravar(criterio, new Date());
    }
    limparCacheDoRanking();
  }
  return proxima;
}
