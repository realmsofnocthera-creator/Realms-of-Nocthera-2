import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MestrePainel, type SessaoDoPainel } from '@/components/mestre/MestrePainel';
import { ConteudoPainel } from '@/components/mestre/ConteudoPainel';
import { DESCRICAO_DO_PAPEL, NOME_DO_PAPEL, permissoesDoPapel, type PapelMestre } from '@/rules/mestre';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const sessao = (papel: PapelMestre): SessaoDoPainel => ({
  uid: 'u1',
  email: 'u1@test.com',
  papel,
  nomeDoPapel: NOME_DO_PAPEL[papel],
  descricao: DESCRICAO_DO_PAPEL[papel],
  origem: papel === 'dono' ? 'ambiente' : 'painel',
  permissoes: [...permissoesDoPapel(papel)],
});
const render = (papel: PapelMestre) => renderToStaticMarkup(<MestrePainel sessao={sessao(papel)} tokenFresco={async () => 't'} />);

describe('Painel do Mestre (tela)', () => {
  it('o Dono vê as três seções: Visão geral, Papéis e Log', () => {
    const html = render('dono');
    expect(html).toContain('Painel do Mestre');
    expect(html).toContain('Visão geral');
    expect(html).toContain('Papéis');
    expect(html).toContain('Log');
    expect(html).toContain('O Dono vem do ambiente do servidor');
  });

  it('quem não gere papéis não vê a seção Papéis, e a Visão geral lista só o que o papel pode', () => {
    for (const p of ['mestre', 'moderador', 'suporte'] as const) {
      const html = render(p);
      expect(html, p).not.toContain('Papéis');
      expect(html, p).toContain('Log');
      expect(html, p).not.toContain('Gerir papéis');
    }
    expect(render('mestre')).toContain('Editar mapas');
    expect(render('suporte')).not.toContain('Editar mapas');
  });

  it('mostra o papel, o e-mail e o que vem em breve', () => {
    const html = render('mestre');
    expect(html).toContain('Mestre');
    expect(html).toContain('u1@test.com');
    expect(html).toContain('Editor de mapas 2D (camadas, pincel, borracha, preencher) e importador de tiles');
  });

  it('quem lê conteúdo vê a aba Mapas; o moderador não', () => {
    expect(render('mestre')).toContain('Mapas');
    expect(render('suporte')).toContain('Mapas');
    expect(render('moderador')).not.toContain('Mapas');
  });
});

describe('Mapas no painel (tela)', () => {
  const lista = (papel: PapelMestre) => renderToStaticMarkup(<ConteudoPainel sessao={sessao(papel)} tokenFresco={async () => 't'} />);

  it('quem edita mapas vê o formulário de mapa novo; o suporte só a lista', () => {
    expect(lista('mestre')).toContain('Novo mapa');
    expect(lista('dono')).toContain('Novo mapa');
    const suporte = lista('suporte');
    expect(suporte).not.toContain('Novo mapa');
    expect(suporte).toContain('Carregando...');
  });
});
