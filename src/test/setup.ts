import { vi } from 'vitest';

// Nenhum teste fala com o Firebase real: Auth e Firestore do servidor são substituídos.
vi.mock('@/server/firebaseAdmin', () => import('./firebaseAdminMock'));
vi.mock('@/server/persistencia', () => import('./repositorioMemoria'));
