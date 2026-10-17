import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as lista } from '@/app/api/conteudo/[tipo]/route';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, reverterConteudo, salvarRascunho } from '@/server/conteudo';
import { limparCatalogoDeItens } from '@/server/catalogoItens';
import type { SessaoMestre } from '@/server/mestre';
import { anuncioEmBranco, anuncioVigente, anunciosVigentes, validarAnuncio, type AnuncioDados } from '@/rules/anuncio';
import { deCampoDeData, descreverJanela, paraCampoDeData } from '@/lib/anunciosTela';
import { limparCacheRevogacao } from '@/server/auth';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre');
const suporte = sessao('suporte');
const AGORA = new Date('2026-10-20T12:00:00.000Z');
const base = (parte: Partial<AnuncioDados> = {}): AnuncioDados => ({ ...anuncioEmBranco('Novidade da semana'), texto: 'O beta abre em novembro.', ativo: true, ...parte });

async function publicar(id: string, dados: AnuncioDados) {
  await criarConteudo(mestre, { tipo: 'anuncio', id, nome: dados.titulo, dados });
  await publicarConteudo(mestre, 'anuncio', id, { revisao: 1, motivo: 'publicado no teste' });
  limparCacheDoConteudo();
  limparCatalogoDeItens();
}
const itensDaRota = async (logado = true) => {
  const r = await lista(new NextRequest('http://t/api/conteudo/anuncio', { headers: logado ? { authorization: `Bearer ${tokenDeTeste('j1')}` } : {} }), { params: Promise.resolve({ tipo: 'anuncio' }) });
  return { status: r.status, itens: ((await r.json()).itens ?? []) as { id: string; dados: AnuncioDados }[] };
};

describe('Anúncios (3.5.3.4)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheDoConteudo();
    limparCatalogoDeItens();
    limparCacheRevogacao();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  describe('schema e janela', () => {
    it('valida título, texto, tipo, datas e que o fim vem depois do início; recusa campo estranho', () => {
      expect(validarAnuncio(base()).ok).toBe(true);
      expect(validarAnuncio(base({ titulo: 'x' })).ok).toBe(false);
      expect(validarAnuncio(base({ texto: ' ' })).ok).toBe(false);
      expect(validarAnuncio({ ...base(), tipo: 'propaganda' }).ok).toBe(false);
      expect(validarAnuncio({ ...base(), inicio: 'ontem' }).ok).toBe(false);
      expect(validarAnuncio(base({ inicio: '2026-10-21T00:00:00.000Z', fim: '2026-10-20T00:00:00.000Z' })).ok).toBe(false);
      expect(validarAnuncio({ ...base(), extra: 1 }).ok).toBe(false);
      expect(validarAnuncio(null).ok).toBe(false);
    });

    it('normaliza as datas para ISO UTC', () => {
      const v = validarAnuncio(base({ inicio: '2026-10-20T09:00:00-03:00' }));
      expect(v.ok && v.dados.inicio).toBe('2026-10-20T12:00:00.000Z');
    });

    it('vigente: ativo, já começado e não terminado', () => {
      expect(anuncioVigente(base(), AGORA)).toBe(true);
      expect(anuncioVigente(base({ ativo: false }), AGORA)).toBe(false);
      expect(anuncioVigente(base({ inicio: '2026-10-21T00:00:00.000Z' }), AGORA)).toBe(false);
      expect(anuncioVigente(base({ inicio: '2026-10-20T12:00:00.000Z' }), AGORA)).toBe(true);
      expect(anuncioVigente(base({ fim: '2026-10-20T12:00:00.000Z' }), AGORA)).toBe(false);
      expect(anuncioVigente(base({ fim: '2026-10-20T12:00:01.000Z' }), AGORA)).toBe(true);
    });

    it('ordena pelo que começou por último e limita a quantidade', () => {
      const itens = [
        { id: 'a', dados: base({ inicio: '2026-10-01T00:00:00.000Z' }) },
        { id: 'b', dados: base({ inicio: '2026-10-10T00:00:00.000Z' }) },
        { id: 'c', dados: base() },
      ];
      expect(anunciosVigentes(itens, AGORA).map((i) => i.id)).toEqual(['b', 'a', 'c']);
      const muitos = Array.from({ length: 30 }, (_, i) => ({ id: String(i), dados: base() }));
      expect(anunciosVigentes(muitos, AGORA)).toHaveLength(20);
    });

    it('o rascunho em branco é válido, mas nasce desativado', () => {
      const v = validarAnuncio(anuncioEmBranco('Aviso novo'));
      expect(v.ok && v.dados.ativo).toBe(false);
    });
  });

  describe('conversões de data da tela', () => {
    it('ida e volta do campo de data e texto da janela', () => {
      const iso = '2026-10-20T12:00:00.000Z';
      expect(deCampoDeData(paraCampoDeData(iso))).toBe(iso);
      expect(paraCampoDeData(null)).toBe('');
      expect(deCampoDeData('')).toBeNull();
      expect(deCampoDeData('lixo')).toBeNull();
      expect(descreverJanela({ inicio: null, fim: null })).toBe('Sem data marcada');
      expect(descreverJanela({ inicio: iso, fim: null })).toMatch(/^A partir de .*Brasília/);
      expect(descreverJanela({ inicio: null, fim: iso })).toMatch(/^Até /);
      expect(descreverJanela({ inicio: iso, fim: '2026-10-25T12:00:00.000Z' })).toMatch(/^De .* até /);
    });
  });

  describe('painel e rota do jogo', () => {
    it('suporte não cria; mestre cria; dado inválido é recusado', async () => {
      await expect(criarConteudo(suporte, { tipo: 'anuncio', id: 'novo', nome: 'Novo aviso', dados: base() })).rejects.toMatchObject({ status: 403 });
      await expect(criarConteudo(mestre, { tipo: 'anuncio', id: 'novo', nome: 'Novo aviso', dados: base({ titulo: '' }) })).rejects.toMatchObject({ status: 400 });
      await expect(criarConteudo(mestre, { tipo: 'anuncio', id: 'novo', nome: 'Novo aviso', dados: base() })).resolves.toMatchObject({ chave: 'anuncio__novo' });
    });

    it('a rota exige login e mostra só o publicado e vigente', async () => {
      await criarConteudo(mestre, { tipo: 'anuncio', id: 'rascunho', nome: 'Só rascunho', dados: base({ titulo: 'Só rascunho' }) });
      await publicar('no-ar', base({ titulo: 'No ar' }));
      await publicar('futuro', base({ titulo: 'Futuro', inicio: '2026-10-25T00:00:00.000Z' }));
      await publicar('vencido', base({ titulo: 'Vencido', fim: '2026-10-19T00:00:00.000Z' }));
      await publicar('desligado', base({ titulo: 'Desligado', ativo: false }));
      const ok = await itensDaRota();
      expect(ok.status).toBe(200);
      expect(ok.itens.map((i) => i.id)).toEqual(['no-ar']);
      expect((await itensDaRota(false)).status).toBe(401);
    });

    it('chegando a data de início, o anúncio passa a aparecer (depois do cache de 30 s)', async () => {
      await publicar('em-breve', base({ titulo: 'Em breve', inicio: '2026-10-20T13:00:00.000Z' }));
      expect((await itensDaRota()).itens).toHaveLength(0);
      vi.setSystemTime(new Date('2026-10-20T13:00:01.000Z'));
      expect((await itensDaRota()).itens.map((i) => i.id)).toEqual(['em-breve']);
    });

    it('editar o rascunho não muda o que está no ar; voltar atrás republica a versão antiga', async () => {
      await publicar('aviso', base({ titulo: 'Versão 1', texto: 'Texto da versão um.' }));
      await salvarRascunho(mestre, 'anuncio', 'aviso', { revisao: 1, dados: base({ titulo: 'Versão 2', texto: 'Texto da versão dois.' }) });
      limparCacheDoConteudo();
      limparCatalogoDeItens();
      expect((await itensDaRota()).itens[0].dados.titulo).toBe('Versão 1');
      await publicarConteudo(mestre, 'anuncio', 'aviso', { revisao: 2, motivo: 'segunda versão' });
      limparCatalogoDeItens();
      expect((await itensDaRota()).itens[0].dados.titulo).toBe('Versão 2');
      await reverterConteudo(mestre, 'anuncio', 'aviso', { versao: 1, ultimaVersao: 2, motivo: 'voltei atrás' });
      limparCatalogoDeItens();
      expect((await itensDaRota()).itens[0].dados.titulo).toBe('Versão 1');
    });
  });
});
