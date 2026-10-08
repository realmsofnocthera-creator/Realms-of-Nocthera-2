import type { CharacterDocument, TransactionDocument } from '@/server/characterService';

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
  };
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
