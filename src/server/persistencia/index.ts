import { adminDb } from '@/server/firebaseAdmin';
import { criarRepositorioFirestore } from './firestore';

export * from './tipos';

/**
 * Firestore é a fonte única dos dados do jogo (0.5-C1).
 * Nos testes, src/test/setup.ts troca este módulo pelo repositório em memória.
 */
export const repositorio = criarRepositorioFirestore(adminDb);
