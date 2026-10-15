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
  EntradaLogAdmin,
  PapelMestreDocumento,
  RegistroCombate,
  Repositorio,
} from '@/server/persistencia/tipos';

export * from '@/server/persistencia/tipos';

interface Estado {
  personagens: Map<string, CharacterDocument>;
  nomes: Map<string, { uid: string; nome: string }>;
  transacoes: TransactionDocument[];
  combates: Map<string, RegistroCombate>;
  revogacoes: Map<string, number>;
  papeisMestre: Map<string, PapelMestreDocumento>;
  logAdmin: EntradaLogAdmin[];
}

const estado: Estado = {
  personagens: new Map(),
  nomes: new Map(),
  transacoes: [],
  combates: new Map(),
  revogacoes: new Map(),
  papeisMestre: new Map(),
  logAdmin: [],
};

let falhaNoLogAdmin: ((entrada: EntradaLogAdmin) => void) | null = null;

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

  async lerRevogacaoSessoes(uid: string) {
    return estado.revogacoes.get(uid) ?? null;
  },

  async gravarRevogacaoSessoes(uid: string, revogadoEmSegundos: number) {
    estado.revogacoes.set(uid, revogadoEmSegundos);
  },

  async lerPapelMestre(uid: string) {
    const valor = estado.papeisMestre.get(uid);
    return valor ? structuredClone(valor) : null;
  },

  async gravarPapelMestre(papel: PapelMestreDocumento) {
    estado.papeisMestre.set(papel.uid, structuredClone(papel));
  },

  async removerPapelMestre(uid: string) {
    estado.papeisMestre.delete(uid);
  },

  async listarPapeisMestre() {
    return [...estado.papeisMestre.values()].map((p) => structuredClone(p));
  },

  async registrarLogAdmin(entrada: EntradaLogAdmin) {
    falhaNoLogAdmin?.(entrada);
    if (estado.logAdmin.some((e) => e.id === entrada.id)) {
      throw Object.assign(new Error(`logAdmin/${entrada.id} já existe`), { code: 6 });
    }
    estado.logAdmin.push(structuredClone(entrada));
  },

  async listarLogAdmin(limite: number) {
    return estado.logAdmin
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (a.e.criadoEm < b.e.criadoEm ? 1 : a.e.criadoEm > b.e.criadoEm ? -1 : b.i - a.i))
      .slice(0, limite)
      .map(({ e }) => structuredClone(e));
  },
};

/** Simula falha ao gravar no log administrativo: o hook recebe a entrada e, se lançar erro, ela não é gravada. */
export function setTestAdminLogFailHook(hook: ((entrada: EntradaLogAdmin) => void) | null): void {
  falhaNoLogAdmin = hook;
}

/** Limpa todos os dados entre testes. */
export function resetCharacterStore(): void {
  estado.personagens.clear();
  estado.nomes.clear();
  estado.transacoes.length = 0;
  estado.combates.clear();
  estado.revogacoes.clear();
  estado.papeisMestre.clear();
  estado.logAdmin.length = 0;
  falhaNoLogAdmin = null;
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
