/**
 * Repositório em memória usado só pelo Vitest (src/test/setup.ts troca
 * src/server/persistencia por este módulo). Segue o mesmo contrato do Firestore:
 * transações atômicas (gravações pendentes até o fim), isoladas (executadas uma por vez)
 * e sem transação aninhada.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import type {
  ContextoTransacao,
  RegistroCombate,
  Repositorio,
} from '@/server/persistencia/tipos';

export * from '@/server/persistencia/tipos';

interface Estado {
  personagens: Map<string, CharacterDocument>;
  nomes: Map<string, { uid: string; nome: string }>;
  transacoes: TransactionDocument[];
  combates: Map<string, RegistroCombate>;
}

const estado: Estado = {
  personagens: new Map(),
  nomes: new Map(),
  transacoes: [],
  combates: new Map(),
};

let falhaAoGravar: ((operacao: string) => void) | null = null;
let fila: Promise<unknown> = Promise.resolve();
const transacaoAtiva = new AsyncLocalStorage<string>();

class ContextoMemoria implements ContextoTransacao {
  personagens = new Map<string, CharacterDocument>();
  nomes = new Map<string, { uid: string; nome: string }>();
  transacoes: TransactionDocument[] = [];
  combates = new Map<string, RegistroCombate>();

  async lerPersonagem(uid: string) {
    const valor = this.personagens.get(uid) ?? estado.personagens.get(uid);
    return valor ? structuredClone(valor) : null;
  }
  gravarPersonagem(personagem: CharacterDocument) {
    this.personagens.set(personagem.uid, structuredClone(personagem));
  }
  async lerDonoDoNome(chaveNome: string) {
    return (this.nomes.get(chaveNome) ?? estado.nomes.get(chaveNome))?.uid ?? null;
  }
  reservarNome(chaveNome: string, uid: string, nome: string) {
    this.nomes.set(chaveNome, { uid, nome });
  }
  registrarTransacao(transacao: TransactionDocument) {
    this.transacoes.push({ ...transacao });
  }
  async lerCombate(id: string) {
    const valor = this.combates.get(id) ?? estado.combates.get(id);
    return valor ? structuredClone(valor) : null;
  }
  gravarCombate(registro: RegistroCombate) {
    if (estado.combates.has(registro.id)) {
      throw Object.assign(new Error(`combates/${registro.id} já existe`), { code: 6 });
    }
    this.combates.set(registro.id, structuredClone(registro));
  }
}

export const repositorio: Repositorio = {
  executarTransacao<T>(operacao: string, fn: (ctx: ContextoTransacao) => Promise<T>): Promise<T> {
    const externa = transacaoAtiva.getStore();
    if (externa) {
      return Promise.reject(
        new Error(`Transação "${operacao}" aberta dentro de "${externa}": use o contexto recebido.`)
      );
    }

    const execucao = fila.then(() =>
      transacaoAtiva.run(operacao, async () => {
        const ctx = new ContextoMemoria();
        const valor = await fn(ctx);
        // Ponto em que o Firestore faria o commit: uma falha aqui não aplica nada
        falhaAoGravar?.(operacao);
        for (const [uid, p] of ctx.personagens) estado.personagens.set(uid, p);
        for (const [chave, dono] of ctx.nomes) estado.nomes.set(chave, dono);
        for (const [id, c] of ctx.combates) estado.combates.set(id, c);
        estado.transacoes.push(...ctx.transacoes);
        return valor;
      })
    );
    fila = execucao.catch(() => undefined);
    return execucao;
  },

  async lerPersonagem(uid: string) {
    const valor = estado.personagens.get(uid);
    return valor ? structuredClone(valor) : null;
  },

  async lerDonoDoNome(chaveNome: string) {
    return estado.nomes.get(chaveNome)?.uid ?? null;
  },
};

/** Limpa todos os dados entre testes. */
export function resetCharacterStore(): void {
  estado.personagens.clear();
  estado.nomes.clear();
  estado.transacoes.length = 0;
  estado.combates.clear();
  falhaAoGravar = null;
}

/** Transações de moeda gravadas para o uid, na ordem em que foram registradas. */
export function getTransactionsByUid(uid: string): TransactionDocument[] {
  return estado.transacoes.filter((t) => t.uid === uid);
}

/**
 * Simula falha no commit das próximas transações: o hook recebe o nome da operação
 * e, se lançar erro, a transação é descartada sem aplicar nenhuma gravação.
 */
export function setTestPersistenceFailHook(hook: ((operacao: string) => void) | null): void {
  falhaAoGravar = hook;
}

export function obterCombateRegistrado(id: string): RegistroCombate | undefined {
  return estado.combates.get(id);
}
