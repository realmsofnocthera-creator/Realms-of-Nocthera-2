import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listaPublicada } from '@/app/api/conteudo/[tipo]/route';
import { createCharacter, fabricarArmadura, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo } from '@/server/conteudo';
import { limparCatalogoDeItens } from '@/server/catalogoItens';
import type { SessaoMestre } from '@/server/mestre';
import { armaduraDadosDePeca, pecaComDados, validarArmadura } from '@/rules/armaduraConteudo';
import { emblemaDadosDeTipo, tipoComDados, validarEmblema } from '@/rules/emblemaConteudo';
import { aplicarEmblemasPublicados, pecaDesativada } from '@/rules/catalogoAoVivo';
import { PECAS_ARMADURA, PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { TIPO_EMBLEMA_MAP, TIPOS_EMBLEMA, tiposDaRaridade } from '@/rules/emblemasCatalogo';
import { custoDaReceita } from '@/game/forja';
import { limparCacheRevogacao } from '@/server/auth';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre');
const suporte = sessao('suporte');
const PECA = 'lobo-cinzento-elmo';
const EMBLEMA = 'dargan';

async function armeiro(uid: string, extra: Record<string, unknown> = {}) {
  const custo = custoDaReceita(PECAS_ARMADURA_MAP[PECA].receita);
  await createCharacter(uid, { nome: 'Armeiro_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
  await updateCharacter(uid, { ouro: 5000, inventario: { ...custo.itens }, ...extra });
}

async function publicar(tipo: 'armadura' | 'emblema', id: string, dados: unknown) {
  await criarConteudo(mestre, { tipo, id, nome: id, dados });
  await publicarConteudo(mestre, tipo, id, { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
  limparCatalogoDeItens();
}

describe('Armaduras e emblemas no banco (3.5.3.2)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheDoConteudo();
    limparCatalogoDeItens();
    limparCacheRevogacao();
  });

  describe('armaduras', () => {
    it('toda peça do código vira dados válidos e volta idêntica', () => {
      expect(PECAS_ARMADURA.length).toBeGreaterThan(100);
      for (const p of PECAS_ARMADURA) {
        const v = validarArmadura(armaduraDadosDePeca(p));
        expect(v.ok, p.id).toBe(true);
        if (v.ok) expect(pecaComDados(p, v.dados), p.id).toEqual(p);
      }
    });

    it('recusa campo estranho, nome curto, raridade e material inválidos', () => {
      const base = armaduraDadosDePeca(PECAS_ARMADURA_MAP[PECA]);
      expect(validarArmadura({ ...base, extra: 1 }).ok).toBe(false);
      expect(validarArmadura({ ...base, nome: 'x' }).ok).toBe(false);
      expect(validarArmadura({ ...base, raridade: 'divino' }).ok).toBe(false);
      expect(validarArmadura({ ...base, receita: { ...base.receita, materiaisMonstro: [{ id: 'inventado', qtd: 1 }] } }).ok).toBe(false);
      expect(validarArmadura(7).ok).toBe(false);
    });

    it('receita e nome publicados valem na Forja de armaduras', async () => {
      await armeiro('a1', { inventario: { 'pele-de-lobo-cinzento': 1 }, ouro: 1000 });
      const base = armaduraDadosDePeca(PECAS_ARMADURA_MAP[PECA]);
      await publicar('armadura', PECA, { ...base, nome: 'Elmo Renomeado', receita: { materiaisMonstro: [{ id: 'pele-de-lobo-cinzento', qtd: 1 }], materiaisMundo: [], diversos: null, ouro: 77 } });
      await fabricarArmadura('a1', PECA, { aleatorio: () => 0.5 });
      expect(PECAS_ARMADURA_MAP[PECA].nome).toBe('Elmo Renomeado');
      const c = (await getCharacterByUid('a1'))!;
      expect(c.ouro).toBe(923);
      expect(c.inventario).toEqual({});
    });

    it('desativada: não fabrica e nada é gravado', async () => {
      await armeiro('b1');
      await publicar('armadura', PECA, { ...armaduraDadosDePeca(PECAS_ARMADURA_MAP[PECA]), ativo: false });
      await expect(fabricarArmadura('b1', PECA)).rejects.toThrow(/não está disponível/);
      expect(pecaDesativada(PECA)).toBe(true);
      const c = (await getCharacterByUid('b1'))!;
      expect(c.armaduras).toEqual([]);
      expect(c.ouro).toBe(5000);
    });
  });

  describe('emblemas', () => {
    it('todo emblema do código vira dados válidos e volta idêntico', () => {
      expect(TIPOS_EMBLEMA).toHaveLength(25);
      for (const t of TIPOS_EMBLEMA) {
        const v = validarEmblema(emblemaDadosDeTipo(t));
        expect(v.ok, t.id).toBe(true);
        if (v.ok) expect(tipoComDados(t, v.dados), t.id).toEqual(t);
      }
    });

    it('recusa atributos repetidos, habilidades demais ou vazias, campo estranho', () => {
      const base = emblemaDadosDeTipo(TIPO_EMBLEMA_MAP[EMBLEMA]);
      expect(validarEmblema({ ...base, atributos: ['forca', 'forca', 'sorte'] }).ok).toBe(false);
      expect(validarEmblema({ ...base, atributos: ['forca', 'sorte', 'magia'] }).ok).toBe(false);
      expect(validarEmblema({ ...base, habilidades: base.habilidades.slice(0, 2) }).ok).toBe(false);
      expect(validarEmblema({ ...base, habilidades: [...base.habilidades.slice(0, 2), { nome: '', descricao: 'x' }] }).ok).toBe(false);
      expect(validarEmblema({ ...base, extra: 1 }).ok).toBe(false);
    });

    it('o publicado troca nome, lore e textos; a raridade e os grupos por raridade ficam', () => {
      const base = emblemaDadosDeTipo(TIPO_EMBLEMA_MAP[EMBLEMA]);
      const antes = tiposDaRaridade('comum').length;
      const novo = { ...base, nome: 'Dargan Reescrito', lore: 'Outra história.', habilidades: base.habilidades.map((h, i) => ({ ...h, nome: `Nova ${i}` })) };
      const v = validarEmblema(novo);
      expect(v.ok).toBe(true);
      if (!v.ok) return;
      aplicarEmblemasPublicados(new Map([[EMBLEMA, v.dados]]));
      expect(TIPO_EMBLEMA_MAP[EMBLEMA]).toMatchObject({ nome: 'Dargan Reescrito', lore: 'Outra história.', raridade: 'comum' });
      expect(TIPO_EMBLEMA_MAP[EMBLEMA].habilidades.map((h) => h.nome)).toEqual(['Nova 0', 'Nova 1', 'Nova 2']);
      expect(tiposDaRaridade('comum')).toHaveLength(antes);
      expect(tiposDaRaridade('comum').find((t) => t.id === EMBLEMA)!.nome).toBe('Dargan Reescrito');
      aplicarEmblemasPublicados(new Map());
      expect(TIPO_EMBLEMA_MAP[EMBLEMA].nome).toBe(emblemaDadosDeTipo(TIPO_EMBLEMA_MAP[EMBLEMA]).nome);
    });

    it('lista de habilidades de outro tamanho não troca as habilidades do código', () => {
      const base = emblemaDadosDeTipo(TIPO_EMBLEMA_MAP[EMBLEMA]);
      const quatro = { ...base, habilidades: [...base.habilidades, { nome: 'Extra', descricao: 'Quarta habilidade.' }] };
      const v = validarEmblema(quatro);
      expect(v.ok).toBe(true);
      if (v.ok) expect(tipoComDados(TIPO_EMBLEMA_MAP[EMBLEMA], v.dados).habilidades).toEqual(TIPO_EMBLEMA_MAP[EMBLEMA].habilidades);
    });
  });

  describe('permissões e rota do jogo', () => {
    it('suporte não cria; mestre cria armadura e emblema', async () => {
      const a = armaduraDadosDePeca(PECAS_ARMADURA_MAP[PECA]);
      await expect(criarConteudo(suporte, { tipo: 'armadura', id: PECA, nome: 'Elmo', dados: a })).rejects.toMatchObject({ status: 403 });
      await expect(criarConteudo(mestre, { tipo: 'armadura', id: PECA, nome: 'Elmo', dados: a })).resolves.toMatchObject({ chave: `armadura__${PECA}` });
      await expect(criarConteudo(mestre, { tipo: 'emblema', id: EMBLEMA, nome: 'Dargan', dados: emblemaDadosDeTipo(TIPO_EMBLEMA_MAP[EMBLEMA]) })).resolves.toMatchObject({ chave: `emblema__${EMBLEMA}` });
    });

    it('a rota do jogo lista armaduras e emblemas publicados', async () => {
      await publicar('armadura', PECA, armaduraDadosDePeca(PECAS_ARMADURA_MAP[PECA]));
      await publicar('emblema', EMBLEMA, emblemaDadosDeTipo(TIPO_EMBLEMA_MAP[EMBLEMA]));
      const req = (tipo: string) => listaPublicada(new NextRequest(`http://t/api/conteudo/${tipo}`, { headers: { authorization: `Bearer ${tokenDeTeste('j1')}` } }), { params: Promise.resolve({ tipo }) });
      expect((await (await req('armadura')).json()).itens.map((i: { id: string }) => i.id)).toEqual([PECA]);
      expect((await (await req('emblema')).json()).itens.map((i: { id: string }) => i.id)).toEqual([EMBLEMA]);
    });
  });
});
