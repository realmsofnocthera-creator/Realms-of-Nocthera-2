import { describe, it, expect, afterEach } from 'vitest';
import { DONOS_DO_PROJETO, donosDoAmbiente, papelDoUsuario } from '@/server/mestre';

/** O Dono registrado no código vale mesmo sem a variável de ambiente e soma-se a ela. */
describe('Dono registrado no projeto', () => {
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('tem ao menos um uid válido', () => {
    expect(DONOS_DO_PROJETO.length).toBeGreaterThan(0);
    for (const uid of DONOS_DO_PROJETO) expect(uid).toMatch(/^[a-zA-Z0-9_-]{1,128}$/);
  });

  it('é Dono sem a variável de ambiente', async () => {
    delete process.env.MESTRE_DONO_UIDS;
    expect(await papelDoUsuario(DONOS_DO_PROJETO[0])).toEqual({ papel: 'dono', origem: 'ambiente' });
    expect(await papelDoUsuario('outro-jogador')).toBeNull();
  });

  it('soma-se aos Donos da variável de ambiente', () => {
    process.env.MESTRE_DONO_UIDS = 'extra1';
    const donos = donosDoAmbiente();
    expect(donos.has('extra1')).toBe(true);
    expect(donos.has(DONOS_DO_PROJETO[0])).toBe(true);
  });
});
