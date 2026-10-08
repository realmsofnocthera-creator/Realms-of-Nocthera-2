import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 1.1.9 — o registro carrega os kits de subclasse sozinho na primeira consulta,
 * sem depender de alguém importar combat.ts antes.
 */
describe('1.1.9 — registro de habilidades sem efeito colateral de importação', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('importar só o registro já permite consultar os kits padrão', async () => {
    const { obterHabilidade, obterPassiva } = await import('@/game/combate/habilidades/registro');
    expect(obterHabilidade('berserker_golpe_desenfreado')?.espaco).toBe('basico');
    expect(obterHabilidade('colosso_furia_do_colosso')?.espaco).toBe('ultimate');
    expect(obterPassiva('colosso_casca_de_pedra')).toBeDefined();
  });

  it('depois de limparRegistroParaTestes o registro fica vazio até registrar de novo', async () => {
    const { obterHabilidade, limparRegistroParaTestes } = await import('@/game/combate/habilidades/registro');
    const { registrarHabilidadesDeSubclasse } = await import('@/game/combate/habilidades/registrarSubclasses');

    limparRegistroParaTestes();
    expect(obterHabilidade('berserker_golpe_desenfreado')).toBeUndefined();

    registrarHabilidadesDeSubclasse();
    registrarHabilidadesDeSubclasse(); // idempotente
    expect(obterHabilidade('berserker_golpe_desenfreado')).toBeDefined();
  });

  it('importar combat.ts não registra nada por conta própria', async () => {
    const registro = await import('@/game/combate/habilidades/registro');
    registro.limparRegistroParaTestes();
    await import('@/game/combat');
    expect(registro.obterHabilidade('berserker_golpe_desenfreado')).toBeUndefined();
  });
});
