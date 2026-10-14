import { describe, it, expect } from 'vitest';
import { MENSAGEM_ESCOLHA_DO_PERFIL, equipamentosDoPerfil, itensEquipados, validarEscolhaDoPerfil } from '@/lib/perfilEquipamentos';
import { PECAS_ARMADURA } from '@/rules/armadurasCatalogo';
import type { ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import type { CharacterDocument } from '@/server/characterService';

const arma = (id: string): ArmaPersonagem => ({ id, baseId: 'lamina-da-geada', categoria: 'espadaGrande', atributo: 'sorte', pontos: 12, reforjas: 0, criadaEm: '' });
const peca = (id: string, pecaId: string): ArmaduraPersonagem => ({ id, pecaId, atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '' });

/** Uma peça de cada espaço, da mais rara à mais comum que o catálogo tem. */
const porEspaco = (espaco: string, raridade: string) => PECAS_ARMADURA.find((p) => p.espaco === espaco && p.raridade === raridade)!;
const ELMO_COMUM = porEspaco('elmo', 'comum');
const PEITORAL_RARO = PECAS_ARMADURA.find((p) => p.espaco === 'peitoral' && p.raridade !== 'comum')!;
const LUVAS = PECAS_ARMADURA.find((p) => p.espaco === 'luvas')!;
const PERNEIRAS = PECAS_ARMADURA.find((p) => p.espaco === 'perneiras')!;
const BOTAS = PECAS_ARMADURA.find((p) => p.espaco === 'botas')!;

type Pers = Pick<CharacterDocument, 'armas' | 'armaduras' | 'equipamento' | 'perfilEquipamentos'>;
const tudo = (extra: Partial<Pers> = {}): Pers => ({
  armas: [arma('w1'), arma('w2')],
  armaduras: [peca('e', ELMO_COMUM.id), peca('p', PEITORAL_RARO.id), peca('l', LUVAS.id), peca('n', PERNEIRAS.id), peca('b', BOTAS.id)],
  equipamento: { armaId: 'w1', armadura: { elmo: 'e', peitoral: 'p', luvas: 'l', perneiras: 'n', botas: 'b' } },
  ...extra,
});

describe('Equipamentos do perfil público', () => {
  it('itensEquipados lista só o que está equipado, na ordem dos espaços', () => {
    expect(itensEquipados(tudo()).map((i) => i.id)).toEqual(['w1', 'e', 'p', 'l', 'n', 'b']);
    expect(itensEquipados(tudo({ equipamento: { armaId: null, armadura: {} } }))).toEqual([]);
  });

  it('sem escolha, a seleção é automática: a arma e depois as peças mais raras', () => {
    const r = equipamentosDoPerfil(tudo());
    expect(r).toHaveLength(4);
    expect(r[0]).toMatchObject({ id: 'w1', slot: 'arma', slotNome: 'Arma' });
    expect(r[1].id).toBe('p'); // o peitoral é o mais raro
    expect(r.map((i) => i.id)).not.toContain('e'); // o elmo Comum fica de fora
  });

  it('cada cartão traz nome, cor, raridade e um detalhe curto (dano da arma, nível da peça)', () => {
    const [a, , pc] = equipamentosDoPerfil(tudo());
    expect(a).toMatchObject({ nome: 'Lâmina da Geada', raridadeNome: expect.any(String) });
    expect(a.curto).toMatch(/^Dano \d+$/);
    expect(a.cor).toMatch(/^#/);
    expect(pc.curto).toBe('Nível 0/30'); // peça nova, sem XP
  });

  it('com escolha, mostra os itens escolhidos na ordem, só se ainda estão equipados', () => {
    const c = tudo({ perfilEquipamentos: ['b', 'w1', 'x-nao-existe', 'w2'] });
    // w2 está na lista de armas, mas não está equipado: sai; x-nao-existe também
    expect(equipamentosDoPerfil(c).map((i) => i.id)).toEqual(['b', 'w1']);
    // desequipou a bota: ela some do perfil
    const sem = { ...c, equipamento: { armaId: 'w1', armadura: { ...c.equipamento!.armadura, botas: undefined } } } as Pers;
    expect(equipamentosDoPerfil(sem).map((i) => i.id)).toEqual(['w1']);
  });

  it('uma escolha vazia mostra nada (o jogador deixou todos os espaços vazios) e a lista é cortada em 4', () => {
    expect(equipamentosDoPerfil(tudo({ perfilEquipamentos: [] }))).toEqual([]);
    expect(equipamentosDoPerfil(tudo({ perfilEquipamentos: ['w1', 'e', 'p', 'l', 'n'] })).map((i) => i.id)).toEqual(['w1', 'e', 'p', 'l']);
  });
});

describe('Validação da escolha do jogador', () => {
  it('aceita até 4 itens diferentes que estão equipados, e também a lista vazia', () => {
    expect(validarEscolhaDoPerfil(tudo(), ['w1', 'p'])).toEqual({ ok: true, ids: ['w1', 'p'] });
    expect(validarEscolhaDoPerfil(tudo(), [])).toEqual({ ok: true, ids: [] });
    expect(validarEscolhaDoPerfil(tudo(), ['w1', 'e', 'p', 'l'])).toMatchObject({ ok: true });
  });

  it('recusa o que não é uma lista de até 4 ids diferentes', () => {
    for (const ruim of [undefined, 'w1', { 0: 'w1' }, ['w1', 'e', 'p', 'l', 'n'], ['w1', 'w1'], ['w1', 2], [''], [null]]) {
      expect(validarEscolhaDoPerfil(tudo(), ruim), JSON.stringify(ruim)).toEqual({ ok: false, erro: MENSAGEM_ESCOLHA_DO_PERFIL.invalida });
    }
  });

  it('recusa item que não está equipado, mesmo que o personagem o tenha', () => {
    expect(validarEscolhaDoPerfil(tudo(), ['w2'])).toEqual({ ok: false, erro: MENSAGEM_ESCOLHA_DO_PERFIL.naoEquipado });
    expect(validarEscolhaDoPerfil(tudo(), ['inventado'])).toMatchObject({ ok: false });
  });
});
