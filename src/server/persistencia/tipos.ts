import type { ProgressoDaCampanha } from '@/game/campanha';
import type { CampoDoRanking, CriterioDeRanking, RankingGuardado, ResumoDePersonagem } from '@/rules/social';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import type { PapelMestre } from '@/rules/mestre';
import type { TipoDeConteudo } from '@/rules/conteudo';
import type { SancaoDocumento } from '@/rules/sancoes';
import type { ConfiguracaoDeSistemas } from '@/rules/sistemas';
import { chaveDoNomeDaGuilda, type GuildaDocumento } from '@/rules/guilda';
import type { EntradaDoChefeSemanal } from '@/rules/chefeSemanal';
import type { PartyDocumento } from '@/rules/testeEquipe';
import type { EntradaDoChefeMundial } from '@/rules/chefeMundial';
import type { MensagemGeral } from '@/rules/correio';
import type { AnuncioDoMercado } from '@/rules/mercado';
import type { EntradaDeRevisao } from '@/rules/integridade';
import type { CadastrosDaRede } from '@/server/integridade';

/**
 * Registro de um combate resolvido (0.5-B1/B3): guarda a semente e a entrada para
 * auditoria e replay, e a resposta para devolver o mesmo resultado em reenvios.
 */
export interface ResumoCampanhaRegistro {
  objetoId: string;
  mapaId: string;
  monstroNome: string;
  descansaAte: number;
  progresso: ProgressoDaCampanha;
}

export interface RegistroCombate {
  id: string;
  uid: string;
  monstroId: string;
  seed: number;
  vencedor: string;
  xpGanho: number;
  ouroGanho: number;
  criadoEm: string;
  entrada: Record<string, unknown>;
  resposta: {
    resultado: unknown;
    levelUps: number;
    transaction?: TransactionDocument;
    mensagens: string[];
    /** Caçada: drops, XP depois da trava e progresso (estrela do monstro-chave vencido). */
    cacada?: ResultadoCacadaRegistro;
    /** Batalha Sangrenta: resumo das ondas, recompensa e tentativas restantes (sem o log das lutas). */
    batalhaSangrenta?: ResumoBatalhaSangrentaRegistro;
    /** Campanha: a área de monstros, até quando ela descansa e o progresso depois da luta (para o reenvio devolver o mesmo). */
    campanha?: ResumoCampanhaRegistro;
    /** Torre Celestial: o andar, o monstro e o que a vitória deu. */
    torre?: ResumoTorreRegistro;
    /** Provação do Guerreiro: o chefe, o resultado e os emblemas. */
    guerreiro?: ResumoGuerreiroRegistro;
  };
}

export interface ResumoGuerreiroRegistro {
  dificuldade: number;
  chefeId: string;
  nome: string;
  mecanicaNome: string;
  venceu: boolean;
  primeiraVitoria: boolean;
  /** Os 4 emblemas ganhos (vazio na derrota). */
  emblemas: { tipoId: string; nome: string; raridade: string }[];
}

export interface ResumoTorreRegistro {
  andar: number;
  chefe: boolean;
  monstroId: string;
  nome: string;
  venceu: boolean;
  xpGanho: number;
  essenciaHabilidade: number;
  diamantes: number;
  fragmentosAscensao: number;
  /** O andar que o personagem enfrenta depois (null depois do 300). */
  proximoAndar: number | null;
}

export interface ResumoBatalhaSangrentaRegistro {
  dificuldade: string;
  estrela: number;
  ondas: { monstroId: string; nome: string; chefe: boolean; vencedor: 'personagem' | 'monstro'; hpInicial: number; hpFinal: number; turnos: number }[];
  ondasVencidas: number;
  /** Todos os chefes foram vencidos (a batalha inteira). */
  chefeVencido: boolean;
  fragmentosAlma: number;
  fragmentosSubclasse: { subclasseId: string; quantidade: number } | null;
  ouro: number;
  diamantes: number;
  tentativasRestantes: number;
}

export interface ResultadoCacadaRegistro {
  monstroId: string;
  estrela: number;
  drops: { materialId: string; quantidade: number }[];
  xpBase: number;
  xpGanho: number;
  chaveVencida?: number;
}

/**
 * Operações disponíveis dentro de uma transação.
 * Leituras acontecem na hora; gravações ficam pendentes e só são aplicadas,
 * todas juntas, quando a função da transação termina sem erro.
 */
export interface ContextoTransacao {
  lerPersonagem(uid: string): Promise<CharacterDocument | null>;
  gravarPersonagem(personagem: CharacterDocument): void;
  lerDonoDoNome(chaveNome: string): Promise<string | null>;
  reservarNome(chaveNome: string, uid: string, nome: string): void;
  registrarTransacao(transacao: TransactionDocument): void;
  lerCombate(id: string): Promise<RegistroCombate | null>;
  gravarCombate(registro: RegistroCombate): void;
  /** Guildas (7.3): o documento com membros, convites e pedidos. */
  lerGuilda(id: string): Promise<GuildaDocumento | null>;
  gravarGuilda(guilda: GuildaDocumento): void;
  apagarGuilda(id: string): void;
  /** nomesDeGuilda/{chave}: garante que dois jogadores não criem guildas com o mesmo nome. */
  lerDonoDoNomeDeGuilda(chave: string): Promise<string | null>;
  reservarNomeDeGuilda(chave: string, guildaId: string, nome: string): void;
  liberarNomeDeGuilda(chave: string): void;
  /** Chefe de guildas (7.3): o registro da guilda na semana. */
  lerEntradaChefeSemanal(semana: string, guildaId: string): Promise<EntradaDoChefeSemanal | null>;
  gravarEntradaChefeSemanal(entrada: EntradaDoChefeSemanal): void;
  /** Party do Teste de Equipe (7.4). */
  lerParty(id: string): Promise<PartyDocumento | null>;
  gravarParty(party: PartyDocumento): void;
  apagarParty(id: string): void;
  /** Chefe Mundial: o melhor dano do jogador no dia. */
  /** `oculto`: a entrada à parte de quem está com limite silencioso (6.5-7). */
  lerEntradaChefeMundial(dia: string, uid: string, oculto?: boolean): Promise<EntradaDoChefeMundial | null>;
  gravarEntradaChefeMundial(entrada: EntradaDoChefeMundial): void;
  /** Correio: uma mensagem para todos (para resgatar o presente dela). */
  lerMensagemGeral(id: string): Promise<MensagemGeral | null>;
  /** Contas criadas numa rede nas últimas 24 horas (6.5-6). */
  lerCadastrosDaRede(marca: string): Promise<CadastrosDaRede | null>;
  gravarCadastrosDaRede(c: CadastrosDaRede): void;
  /** Troca entre jogadores (7.2): o anúncio e os preços das últimas vendas de um item. */
  lerAnuncioDoMercado(id: string): Promise<AnuncioDoMercado | null>;
  gravarAnuncioDoMercado(a: AnuncioDoMercado): void;
  apagarAnuncioDoMercado(id: string): void;
  lerPrecosDoMercado(chave: string): Promise<number[]>;
  gravarPrecosDoMercado(chave: string, precos: number[]): void;
}

/** Papel de Mestre concedido pelo painel (o Dono vem do ambiente e não é gravado aqui). */
export interface PapelMestreDocumento {
  uid: string;
  papel: PapelMestre;
  concedidoPor: string;
  concedidoEm: string;
  motivo: string;
}

/** Registro do log administrativo (3.5.5.1): só se cria, nunca se altera nem se apaga. */
export interface EntradaLogAdmin {
  id: string;
  criadoEm: string;
  uid: string;
  email: string;
  papel: PapelMestre;
  acao: string;
  alvo?: string;
  antes?: unknown;
  depois?: unknown;
  motivo?: string;
  ip?: string;
}

/** Item de conteúdo sem os dados (para listas): rascunho atual e versão publicada. */
export interface ResumoConteudo {
  chave: string;
  tipo: TipoDeConteudo;
  id: string;
  nome: string;
  /** Sobe a cada gravação do rascunho: quem salva ou publica informa a revisão que viu. */
  revisao: number;
  hashRascunho: string;
  editadoEm: string;
  editadoPor: string;
  criadoEm: string;
  criadoPor: string;
  /** Número da versão no ar, ou null se nunca foi publicado. */
  versaoPublicada: number | null;
  hashPublicado: string | null;
  /** Maior número de versão já criado (as versões nunca se apagam). */
  ultimaVersao: number;
}

/** conteudo/{chave}: o item com o rascunho. */
export interface ConteudoDocumento extends ResumoConteudo {
  rascunho: unknown;
}

/** Versão publicada sem os dados (para o histórico). */
export interface ResumoVersao {
  versao: number;
  hash: string;
  publicadoEm: string;
  publicadoPor: string;
  motivo: string;
  /** 'publicacao' veio do rascunho; 'reversao' republicou a versão `revertidaDe`. */
  origem: 'publicacao' | 'reversao';
  revertidaDe: number | null;
}

/** conteudo/{chave}/versoes/{versao}: só se cria, nunca se altera. */
export interface VersaoConteudo extends ResumoVersao {
  dados: unknown;
}

export type FalhaConteudo = 'inexistente' | 'conflito';

export interface Repositorio {
  /**
   * Executa `fn` de forma atômica: ou todas as gravações são aplicadas, ou nenhuma.
   * Pode reexecutar `fn` em caso de conflito, então `fn` não deve ter efeitos fora do contexto.
   */
  executarTransacao<T>(operacao: string, fn: (ctx: ContextoTransacao) => Promise<T>): Promise<T>;
  lerPersonagem(uid: string): Promise<CharacterDocument | null>;
  lerDonoDoNome(chaveNome: string): Promise<string | null>;
  /**
   * Instante (epoch em segundos) do último logout no servidor, ou null se nunca houve (0.5-A4).
   * Tokens cujo auth_time seja menor ou igual a esse valor são recusados.
   */
  lerRevogacaoSessoes(uid: string): Promise<number | null>;
  gravarRevogacaoSessoes(uid: string, revogadoEmSegundos: number): Promise<void>;
  lerPapelMestre(uid: string): Promise<PapelMestreDocumento | null>;
  gravarPapelMestre(papel: PapelMestreDocumento): Promise<void>;
  removerPapelMestre(uid: string): Promise<void>;
  listarPapeisMestre(): Promise<PapelMestreDocumento[]>;
  /** Cria o registro (falha se o id já existe): o log não aceita alteração. */
  registrarLogAdmin(entrada: EntradaLogAdmin): Promise<void>;
  /** Os registros mais recentes primeiro. */
  listarLogAdmin(limite: number): Promise<EntradaLogAdmin[]>;
  lerConteudo(chave: string): Promise<ConteudoDocumento | null>;
  listarConteudos(tipo: TipoDeConteudo): Promise<ResumoConteudo[]>;
  /** Cria o item (false se a chave já existe). */
  criarConteudo(doc: ConteudoDocumento): Promise<boolean>;
  /** Troca o rascunho se a revisão ainda for `revisaoBase` (senão 'conflito'); a revisão sobe 1. */
  salvarRascunhoConteudo(
    chave: string,
    revisaoBase: number,
    alteracao: { rascunho: unknown; hashRascunho: string; editadoEm: string; editadoPor: string; nome?: string }
  ): Promise<ConteudoDocumento | FalhaConteudo>;
  /**
   * Numa transação: confere a condição (revisão do rascunho e/ou última versão), cria a versão ultimaVersao + 1
   * e a põe no ar. 'conflito' se a condição não vale mais.
   */
  publicarVersaoConteudo(
    chave: string,
    condicao: { revisao?: number; ultimaVersao?: number },
    versao: Omit<VersaoConteudo, 'versao'>
  ): Promise<{ conteudo: ConteudoDocumento; versao: VersaoConteudo } | FalhaConteudo>;
  /** As versões mais recentes primeiro. */
  listarVersoesConteudo(chave: string, limite: number): Promise<ResumoVersao[]>;
  lerVersaoConteudo(chave: string, versao: number): Promise<VersaoConteudo | null>;
  /** Sanção da conta (3.5.4.3), ou null se o jogador nunca foi sancionado. */
  lerSancao(uid: string): Promise<SancaoDocumento | null>;
  gravarSancao(doc: SancaoDocumento): Promise<void>;
  /** Os uids com limite silencioso ligado (6.5-7). */
  listarComLimiteSilencioso(): Promise<string[]>;
  /** As transações de moeda do jogador, da mais recente para a mais antiga (3.5.4.1). */
  listarTransacoes(uid: string, limite: number): Promise<TransactionDocument[]>;
  /** Sistemas desligados e modo manutenção (3.5.5.2), ou null se nunca foi configurado (tudo ligado). */
  lerConfiguracaoDeSistemas(): Promise<ConfiguracaoDeSistemas | null>;
  gravarConfiguracaoDeSistemas(config: ConfiguracaoDeSistemas): Promise<void>;
  /** Os combates registrados do jogador, do mais recente para o mais antigo (exportação de dados, 3.5.4.4). */
  listarCombatesDoJogador(uid: string, limite: number): Promise<RegistroCombate[]>;
  /**
   * Apaga os dados do jogador: personagem, reserva do nome, transações, sanção e marca de logout.
   * NÃO apaga o log administrativo nem os registros de combate (auditoria). Idempotente.
   */
  excluirDadosDoJogador(uid: string, chaveNome: string | null): Promise<void>;
  /** Os personagens com o maior valor no campo do ranking (7.1), do maior para o menor, só com o que é público. */
  consultarTopo(campo: CampoDoRanking, limite: number): Promise<ResumoDePersonagem[]>;
  /** Personagens cujo nome começa com o texto (já em minúsculas), em ordem alfabética (7.1). */
  buscarPorPrefixo(prefixo: string, limite: number): Promise<ResumoDePersonagem[]>;
  /** O retrato guardado de um ranking, ou null se ainda não foi montado. */
  lerRanking(criterio: CriterioDeRanking): Promise<RankingGuardado | null>;
  gravarRanking(ranking: RankingGuardado): Promise<void>;
  lerGuilda(id: string): Promise<GuildaDocumento | null>;
  /** As guildas com mais membros (7.3). */
  listarGuildas(limite: number): Promise<GuildaDocumento[]>;
  /** Guildas cujo nome começa com o texto (já em minúsculas), em ordem alfabética. */
  buscarGuildasPorPrefixo(prefixo: string, limite: number): Promise<GuildaDocumento[]>;
  /** Chefe de guildas: as guildas da semana com mais dano. */
  listarChefeSemanal(semana: string, limite: number): Promise<EntradaDoChefeSemanal[]>;
  /** Quantas guildas da semana têm mais dano que o total (a posição é isso + 1). */
  contarGuildasAcimaNoChefeSemanal(semana: string, total: number): Promise<number>;
  lerEntradaChefeSemanal(semana: string, guildaId: string): Promise<EntradaDoChefeSemanal | null>;
  /** Party do Teste de Equipe (7.4), fora de transação. */
  lerParty(id: string): Promise<PartyDocumento | null>;
  /** Chefe Mundial: os jogadores do dia com mais dano. */
  listarChefeMundial(dia: string, limite: number): Promise<EntradaDoChefeMundial[]>;
  /** Quantos jogadores do dia têm mais dano (a posição é isso + 1). */
  contarAcimaNoChefeMundial(dia: string, dano: number): Promise<number>;
  /** `oculto`: a entrada à parte de quem está com limite silencioso (6.5-7). */
  lerEntradaChefeMundial(dia: string, uid: string, oculto?: boolean): Promise<EntradaDoChefeMundial | null>;
  /** Correio: as mensagens para todos criadas a partir de `desde` (ISO), das mais novas para as mais antigas. */
  listarMensagensGerais(desde: string, limite: number): Promise<MensagemGeral[]>;
  gravarMensagemGeral(mensagem: MensagemGeral): Promise<void>;
  /** Fila de revisão (6.5-4): as entradas ainda não revisadas, das mais novas para as mais antigas. */
  listarRevisoesPendentes(limite: number): Promise<EntradaDeRevisao[]>;
  /** Grava uma entrada fora de transação (ex.: a conta barrada pelo limite da rede). */
  gravarRevisao(entrada: EntradaDeRevisao): Promise<void>;
  /** Marca as entradas como revisadas; devolve quantas existiam. */
  marcarRevisoes(ids: readonly string[], por: string, em: string): Promise<number>;
  /** Troca entre jogadores (7.2): todos os anúncios (os vendidos e cancelados são apagados) e um anúncio fora de transação. */
  listarAnunciosDoMercado(): Promise<AnuncioDoMercado[]>;
  lerAnuncioDoMercado(id: string): Promise<AnuncioDoMercado | null>;
}

/**
 * Falha de leitura ou gravação no banco (0.5-C1). Nunca vira sucesso silencioso:
 * as rotas respondem 503 para o cliente tentar de novo.
 */
export class ErroPersistencia extends Error {
  readonly status = 503;

  constructor(
    readonly operacao: string,
    readonly causa?: unknown
  ) {
    super('Não foi possível salvar seu progresso agora. Tente novamente em instantes.');
    this.name = 'ErroPersistencia';
  }
}

/** Chave do documento-índice nomesDeGuilda/{chave} (7.3): o nome normalizado da guilda, seguro como ID do Firestore. */
export function chaveDoNomeDeGuilda(nome: string): string {
  return `g_${Buffer.from(chaveDoNomeDaGuilda(nome), 'utf8').toString('base64url')}`;
}

/** Chave do documento-índice nomes/{chave} (0.5-C3): nome normalizado, seguro como ID do Firestore. */
export function chaveDoNome(nome: string): string {
  const normalizado = nome.trim().toLowerCase();
  return `n_${Buffer.from(normalizado, 'utf8').toString('base64url')}`;
}
