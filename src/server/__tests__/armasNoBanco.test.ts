import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listaPublicada } from '@/app/api/conteudo/[tipo]/route';
import { createCharacter, fabricarArma, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo } from '@/server/conteudo';
import { limparCatalogoDeItens } from '@/server/catalogoItens';
import type { SessaoMestre } from '@/server/mestre';
import { armaComDados, armaDadosDeBase, validarArma } from '@/rules/armaConteudo';
import { aplicarArmasPublicadas, armaDesativada } from '@/rules/catalogoAoVivo';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { limparCacheRevogacao } from '@/server/auth';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre');
const suporte = sessao('suporte');
const MATERIAIS_FERRO = { 'pelo-de-rato': 6, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 };
const FERRO = ARMAS_BASE_MAP['ferro-de-cacada'];

async function ferreiro(uid: string, extra: Record<string, unknown> = {}) {
  await createCharacter(uid, { nome: 'Ferreiro_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
  await updateCharacter(uid, { ouro: 1000, inventario: { ...MATERIAIS_FERRO }, ...extra });
}

async function publicarArma(id: string, dados: unknown) {
  await criarConteudo(mestre, { tipo: 'arma', id, nome: id, dados });
  await publicarConteudo(mestre, 'arma', id, { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
  limparCatalogoDeItens();
}

describe('Armas no banco (3.5.2.1 e 3.5.3.2)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheDoConteudo();
    limparCatalogoDeItens();
    limparCacheRevogacao();
  });

  describe('schema', () => {
    it('toda arma do código vira dados válidos e volta idêntica (publicar sem mexer não muda nada)', () => {
      expect(ARMAS_BASE.length).toBe(164);
      for (const a of ARMAS_BASE) {
        const v = validarArma(armaDadosDeBase(a));
        expect(v.ok, a.id).toBe(true);
        if (v.ok) expect(armaComDados(a, v.dados), a.id).toEqual(a);
      }
    });

    it('recusa campo estranho, material desconhecido, quantidade e ouro fora da faixa, nome curto, raridade inválida', () => {
      const base = armaDadosDeBase(FERRO);
      const ruim = (parte: object) => validarArma({ ...base, ...parte });
      expect(ruim({ extra: 1 }).ok).toBe(false);
      expect(ruim({ raridade: 'divino' }).ok).toBe(false);
      expect(ruim({ nomes: { ...base.nomes, katana: 'x' } }).ok).toBe(false);
      expect(ruim({ receita: { ...base.receita, ouro: -1 } }).ok).toBe(false);
      expect(ruim({ receita: { ...base.receita, materiaisMonstro: [{ id: 'inventado', qtd: 1 }] } }).ok).toBe(false);
      expect(ruim({ receita: { ...base.receita, materiaisMonstro: [{ id: 'pelo-de-rato', qtd: 0 }] } }).ok).toBe(false);
      expect(ruim({ receita: { ...base.receita, materiaisMonstro: [{ id: 'pelo-de-rato', qtd: 1 }, { id: 'pelo-de-rato', qtd: 2 }] } }).ok).toBe(false);
      expect(ruim({ receita: { ...base.receita, diversos: { raridade: 'x', qtd: 1 } } }).ok).toBe(false);
      expect(validarArma(null).ok).toBe(false);
    });
  });

  it('aplicar de novo sem a arma publicada devolve o original (nome, receita e ativo)', () => {
    const dados = armaDadosDeBase(FERRO);
    aplicarArmasPublicadas(new Map([['ferro-de-cacada', { ...dados, ativo: false, raridade: 'mitico', receita: { ...dados.receita, ouro: 1 } }]]));
    expect(ARMAS_BASE_MAP['ferro-de-cacada'].receita.ouro).toBe(1);
    expect(armaDesativada('ferro-de-cacada')).toBe(true);
    aplicarArmasPublicadas(new Map());
    expect(ARMAS_BASE_MAP['ferro-de-cacada'].receita.ouro).toBe(FERRO.receita.ouro);
    expect(ARMAS_BASE_MAP['ferro-de-cacada'].raridade).toBe(FERRO.raridade);
    expect(armaDesativada('ferro-de-cacada')).toBe(false);
  });

  describe('na Forja', () => {
    it('receita publicada vale: cobra o ouro novo e os materiais novos', async () => {
      await ferreiro('a1', { ouro: 1000, inventario: { 'pelo-de-rato': 1, 'mundo-osso-bruto': 5 } });
      const dados = armaDadosDeBase(FERRO);
      await publicarArma('ferro-de-cacada', { ...dados, receita: { materiaisMonstro: [{ id: 'pelo-de-rato', qtd: 1 }], materiaisMundo: [{ id: 'mundo-osso-bruto', qtd: 5 }], diversos: null, ouro: 250 } });
      const r = await fabricarArma('a1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
      expect(r.arma.baseId).toBe('ferro-de-cacada');
      const c = (await getCharacterByUid('a1'))!;
      expect(c.ouro).toBe(750);
      expect(c.inventario).toEqual({});
    });

    it('nome publicado aparece no catálogo e na transação da forja', async () => {
      await ferreiro('b1');
      await publicarArma('ferro-de-cacada', { ...armaDadosDeBase(FERRO), nomes: { ...armaDadosDeBase(FERRO).nomes, lanca: 'Lança Renomeada' } });
      await fabricarArma('b1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
      expect(ARMAS_BASE_MAP['ferro-de-cacada'].nomes.lanca).toBe('Lança Renomeada');
      expect(ARMAS_BASE.find((a) => a.id === 'ferro-de-cacada')!.nomes.lanca).toBe('Lança Renomeada');
    });

    it('rascunho não vale: a forja segue com os valores do código', async () => {
      await ferreiro('c1');
      await criarConteudo(mestre, { tipo: 'arma', id: 'ferro-de-cacada', nome: 'Rascunho', dados: { ...armaDadosDeBase(FERRO), receita: { ...armaDadosDeBase(FERRO).receita, ouro: 999 } } });
      limparCatalogoDeItens();
      const r = await fabricarArma('c1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
      expect(r.character.ouro).toBe(900);
    });

    it('desativada: não fabrica e nada é gravado; as outras armas seguem', async () => {
      await ferreiro('d1');
      await publicarArma('ferro-de-cacada', { ...armaDadosDeBase(FERRO), ativo: false });
      await expect(fabricarArma('d1', { baseId: 'ferro-de-cacada', categoria: 'lanca' })).rejects.toThrow(/não está disponível/);
      expect(armaDesativada('ferro-de-cacada')).toBe(true);
      expect(armaDesativada('montante-de-pelo')).toBe(false);
      const c = (await getCharacterByUid('d1'))!;
      expect(c.armas ?? []).toHaveLength(0);
      expect(c.ouro).toBe(1000);
    });
  });

  describe('permissões e rota do jogo', () => {
    it('suporte não cria; mestre cria; dado inválido é recusado', async () => {
      const dados = armaDadosDeBase(FERRO);
      await expect(criarConteudo(suporte, { tipo: 'arma', id: 'ferro-de-cacada', nome: 'Rascunho', dados })).rejects.toMatchObject({ status: 403 });
      await expect(criarConteudo(mestre, { tipo: 'arma', id: 'ferro-de-cacada', nome: 'Rascunho', dados: { ...dados, ativo: 'sim' } })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'arma', id: 'ferro-de-cacada', nome: 'Rascunho', dados })).resolves.toMatchObject({ chave: 'arma__ferro-de-cacada' });
    });

    it('a rota do jogo lista só o publicado, exige login e recusa tipo fora do catálogo', async () => {
      await criarConteudo(mestre, { tipo: 'arma', id: 'montante-de-pelo', nome: 'rascunho', dados: armaDadosDeBase(ARMAS_BASE_MAP['montante-de-pelo']) });
      await publicarArma('ferro-de-cacada', armaDadosDeBase(FERRO));
      const req = (tipo: string, logado = true) =>
        listaPublicada(new NextRequest(`http://t/api/conteudo/${tipo}`, { headers: logado ? { authorization: `Bearer ${tokenDeTeste('j1')}` } : {} }), { params: Promise.resolve({ tipo }) });
      const ok = await req('arma');
      expect(ok.status).toBe(200);
      expect((await ok.json()).itens.map((i: { id: string }) => i.id)).toEqual(['ferro-de-cacada']);
      expect((await req('arma', false)).status).toBe(401);
      expect((await req('mapa')).status).toBe(404);
    });
  });
});
