import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import type { PapelMestre } from '@/rules/mestre';
import type { TipoDeConteudo } from '@/rules/conteudo';
import type { SancaoDocumento } from '@/rules/sancoes';

/**
 * Registro de um combate resolvido (0.5-B1/B3): guarda a semente e a entrada para
 * auditoria e replay, e a resposta para devolver o mesmo resultado em reenvios.
 */
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
  /** As transações de moeda do jogador, da mais recente para a mais antiga (3.5.4.1). */
  listarTransacoes(uid: string, limite: number): Promise<TransactionDocument[]>;
  /** Os combates registrados do jogador, do mais recente para o mais antigo (exportação de dados, 3.5.4.4). */
  listarCombatesDoJogador(uid: string, limite: number): Promise<RegistroCombate[]>;
  /**
   * Apaga os dados do jogador: personagem, reserva do nome, transações, sanção e marca de logout.
   * NÃO apaga o log administrativo nem os registros de combate (auditoria). Idempotente.
   */
  excluirDadosDoJogador(uid: string, chaveNome: string | null): Promise<void>;
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

/** Chave do documento-índice nomes/{chave} (0.5-C3): nome normalizado, seguro como ID do Firestore. */
export function chaveDoNome(nome: string): string {
  const normalizado = nome.trim().toLowerCase();
  return `n_${Buffer.from(normalizado, 'utf8').toString('base64url')}`;
}
