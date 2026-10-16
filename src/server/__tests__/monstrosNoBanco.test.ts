import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, executarCacada, executarCombate, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo } from '@/server/conteudo';
import type { SessaoMestre } from '@/server/mestre';
import { MONSTROS_CACADA } from '@/rules/cacada';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { MONSTERS } from '@/rules/monsters';
import { monstroComDados, monstroDadosDeDefinicao, validarMonstro } from '@/rules/monstroConteudo';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono');
const mestre = sessao('mestre');
const suporte = sessao('suporte');
const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };

async function jogador(uid: string, nivel = 30) {
  await createCharacter(uid, { nome: 'Cacador_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
  await updateCharacter(uid, { nivel, atributos: FORTE, ouro: 500 });
}

async function publicarMonstro(id: string, dados: unknown) {
  await criarConteudo(mestre, { tipo: 'monstro', id, nome: id, dados });
  await publicarConteudo(dono, 'monstro', id, { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
}

describe('Monstros no banco (3.5.2.1 e 3.5.3.1)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheDoConteudo();
    vi.restoreAllMocks();
  });

  describe('schema', () => {
    it('todo monstro do código vira dados válidos e volta idêntico (publicar sem mexer não muda a luta)', () => {
      const todos = [...MONSTERS, ...MONSTROS_CACADA, ...Object.values(CHEFES_ESPECIAIS_MAP)];
      expect(todos.length).toBeGreaterThan(50);
      for (const m of todos) {
        const v = validarMonstro(monstroDadosDeDefinicao(m));
        expect(v.ok, m.id).toBe(true);
        if (v.ok) expect(monstroComDados(m.id, v.dados, m), m.id).toEqual(m);
      }
    });

    it('recusa campo estranho, números fora da faixa, elemento e status desconhecidos, ouro invertido', () => {
      const base = monstroDadosDeDefinicao(MONSTERS[0]);
      const ruim = (parte: object) => validarMonstro({ ...base, ...parte });
      expect(ruim({ extra: 1 }).ok).toBe(false);
      expect(ruim({ hp: 0 }).ok).toBe(false);
      expect(ruim({ nivel: 1.5 }).ok).toBe(false);
      expect(ruim({ nome: 'x' }).ok).toBe(false);
      expect(ruim({ categoriaCorporal: 'dragao' }).ok).toBe(false);
      expect(ruim({ modificadoresElementais: { lava: 10 } }).ok).toBe(false);
      expect(ruim({ modificadoresElementais: { fogo: 900 } }).ok).toBe(false);
      expect(ruim({ efeitosAplicados: ['explosao'] }).ok).toBe(false);
      expect(ruim({ ouroConcedido: { min: 9, max: 1 } }).ok).toBe(false);
      expect(ruim({ atributos: { ...base.atributos, forca: -1 } }).ok).toBe(false);
      expect(validarMonstro('texto').ok).toBe(false);
    });
  });

  describe('na luta', () => {
    it('sem nada publicado a luta é a do código; publicado com os mesmos números dá o mesmo resultado', async () => {
      await jogador('a1');
      const antes = await executarCacada('a1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0010' });
      const lobo = MONSTROS_CACADA.find((m) => m.id === 'lobo-cinzento')!;
      await publicarMonstro('lobo-cinzento', monstroDadosDeDefinicao(lobo));
      const depois = await executarCacada('a1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0011' });
      // o ouro final do personagem é do estado dele (já tinha ganho da 1ª luta); o resto da luta é idêntico
      const semOuroFinal = (r: typeof antes.resultado) => ({ ...r, personagemFinal: { ...r.personagemFinal, ouro: 0 } });
      expect(semOuroFinal(depois.resultado)).toEqual(semOuroFinal(antes.resultado));
      expect(depois.cacada.xpBase).toBe(antes.cacada.xpBase);
    });

    it('publicar números diferentes muda a luta (XP base) e o que ficou no código se mantém', async () => {
      await jogador('b1');
      const lobo = MONSTROS_CACADA.find((m) => m.id === 'lobo-cinzento')!;
      await publicarMonstro('lobo-cinzento', { ...monstroDadosDeDefinicao(lobo), xpConcedido: 999, nome: 'Lobo Editado' });
      const r = await executarCacada('b1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0012' });
      expect(r.cacada.xpBase).toBe(999);
      expect(r.resultado.mensagens.join(' ')).toContain('Lobo Editado');
    });

    it('rascunho não vale: só o publicado', async () => {
      await jogador('c1');
      const lobo = MONSTROS_CACADA.find((m) => m.id === 'lobo-cinzento')!;
      await criarConteudo(mestre, { tipo: 'monstro', id: 'lobo-cinzento', nome: 'Lobo', dados: { ...monstroDadosDeDefinicao(lobo), xpConcedido: 999 } });
      limparCacheDoConteudo();
      const r = await executarCacada('c1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0013' });
      expect(r.cacada.xpBase).toBe(lobo.xpConcedido);
    });

    it('desativado: a luta é recusada com aviso e nada é gravado', async () => {
      await jogador('d1');
      const lobo = MONSTROS_CACADA.find((m) => m.id === 'lobo-cinzento')!;
      await publicarMonstro('lobo-cinzento', { ...monstroDadosDeDefinicao(lobo), ativo: false });
      await expect(executarCacada('d1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-teste-0014' })).rejects.toThrow(/indisponível/);
      expect((await getCharacterByUid('d1'))!.inventario).toEqual({});
    });

    it('arena: o monstro do código muda e um monstro novo só do banco também luta', async () => {
      await jogador('e1', 1);
      const rato = MONSTERS.find((m) => m.id === 'rato-da-peste')!;
      await publicarMonstro('rato-da-peste', { ...monstroDadosDeDefinicao(rato), xpConcedido: 777 });
      const r1 = await executarCombate('e1', 'rato-da-peste', { seed: 3, combateId: 'arena-teste-0001' });
      expect(r1.resultado.xpGanho).toBe(777);
      await publicarMonstro('coelho-raivoso', { ...monstroDadosDeDefinicao(rato), nome: 'Coelho Raivoso', xpConcedido: 11 });
      const r2 = await executarCombate('e1', 'coelho-raivoso', { seed: 3, combateId: 'arena-teste-0002' });
      expect(r2.resultado.xpGanho).toBe(11);
      await expect(executarCombate('e1', 'nao-existe', { seed: 1 })).rejects.toThrow('não encontrado');
    });
  });

  describe('permissões', () => {
    it('mestre cria e dono publica; suporte não cria', async () => {
      const rato = monstroDadosDeDefinicao(MONSTERS[0]);
      await expect(criarConteudo(suporte, { tipo: 'monstro', id: 'novo-monstro', nome: 'Novo', dados: rato })).rejects.toMatchObject({ status: 403 });
      await expect(criarConteudo(mestre, { tipo: 'monstro', id: 'novo-monstro', nome: 'Novo', dados: { ...rato, hp: -5 } })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'monstro', id: 'novo-monstro', nome: 'Novo', dados: rato })).resolves.toMatchObject({ chave: 'monstro__novo-monstro' });
    });
  });
});
