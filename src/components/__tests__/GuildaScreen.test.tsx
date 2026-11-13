import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuildaScreen } from '@/components/guilda/GuildaScreen';
import { PracaDaGuilda } from '@/components/guilda/PracaDaGuilda';
import { SecaoContratos, SecaoCriar, SecaoConvites } from '@/components/guilda/SecoesDaGuilda';
import { MOLDURAS_DA_PRACA, PRACA_DA_GUILDA } from '@/assets/guildaUi';
import { TEXTOS_DA_GUILDA as T } from '@/rules/textosDaGuilda';
import type { ContratoNaTela, EstadoDaGuilda } from '@/server/guildas';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const agir = async () => true;
const regras = { nivelMinimo: 10, custoOuro: 5000, xpPorNivel: [100], membrosPorNivel: [10] };
const estadoSem = (eu: Partial<EstadoDaGuilda['eu']> = {}) =>
  ({ regras, eu: { nome: 'Yuri', nivel: 30, ouro: 9000, materiais: [], ...eu }, minha: null, convites: [], pedidos: [], contratos: [] }) as unknown as EstadoDaGuilda;

describe('Tela da Guilda (praça em pixel)', () => {
  it('abre com o título, a volta ao Hub, a praça e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<GuildaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain(T.titulo);
    expect(html).toContain('href="/hud"');
    expect(html).toContain(`aria-label="${T.voltar}"`);
    expect(html).toContain(T.carregando);
    expect(html).toContain(PRACA_DA_GUILDA.imagem);
  });

  it('o vídeo toca sozinho, mudo e em repetição, com a imagem de capa e as duas fontes (AV1 e H.264)', () => {
    const html = renderToStaticMarkup(<GuildaScreen tokenFresco={async () => 't'} />);
    expect(html).toMatch(/<video[^>]*\sautoPlay=""|<video[^>]*autoplay/i);
    expect(html).toContain('loop');
    expect(html).toContain('playsInline');
    expect(html).toContain(`poster="${PRACA_DA_GUILDA.imagem}"`);
    expect(html.indexOf(PRACA_DA_GUILDA.videoAv1)).toBeGreaterThan(-1);
    expect(html.indexOf(PRACA_DA_GUILDA.videoAv1)).toBeLessThan(html.indexOf(PRACA_DA_GUILDA.videoH264));
    expect(html).toContain('av01.0.08M.08');
  });

  it('as molduras ficam dentro do quadro da arte e a cena guarda a proporção 1024 x 1536', () => {
    expect(PRACA_DA_GUILDA.largura / PRACA_DA_GUILDA.altura).toBeCloseTo(2 / 3, 3);
    for (const [x0, y0, x1, y1] of Object.values(MOLDURAS_DA_PRACA)) {
      expect(x0).toBeGreaterThanOrEqual(0);
      expect(y0).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(PRACA_DA_GUILDA.largura);
      expect(y1).toBeLessThanOrEqual(PRACA_DA_GUILDA.altura);
      expect(x1).toBeGreaterThan(x0);
      expect(y1).toBeGreaterThan(y0);
    }
    const html = renderToStaticMarkup(<GuildaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('aspect-ratio:1024 / 1536');
  });

  it('cada placa é um botão com o nome, o aviso numérico aparece e uma moldura sem placa fica vazia', () => {
    const html = renderToStaticMarkup(
      <PracaDaGuilda placas={{ placa1: { rotulo: 'Contratos', aviso: 2 }, placa2: { rotulo: 'Incursões', desligada: true } }} aoAbrir={() => {}} quadro={<span>Quadro</span>} quadroAria="Quadro de avisos" quadroAtivo />
    );
    expect(html).toContain('aria-label="Contratos (2)"');
    expect(html).toContain('aria-label="Incursões"');
    expect(html).toMatch(/aria-label="Incursões"[^>]*disabled|disabled=""[^>]*aria-label="Incursões"/);
    expect(html).not.toContain('placa3');
    expect(html.match(/<button/g)).toHaveLength(3);
  });

  it('os contratos mostram o progresso e só o contrato pronto tem o botão Entregar', () => {
    const contratos = [
      { id: 'c1', tipo: 'vencer', quantidade: 5, nomeAlvo: '', recompensa: { ouro: 800, xpGuilda: 20, materiais: [] }, feito: 5, pronto: true, entregue: false },
      { id: 'c2', tipo: 'derrotar', quantidade: 3, nomeAlvo: 'Rato da Floresta', recompensa: { ouro: 600, xpGuilda: 15, materiais: ['osso'] }, feito: 1, pronto: false, entregue: false },
      { id: 'c3', tipo: 'entregar', quantidade: 4, nomeAlvo: 'Osso', recompensa: { ouro: 500, xpGuilda: 10, materiais: [] }, feito: 4, pronto: true, entregue: true },
    ] as unknown as ContratoNaTela[];
    const html = renderToStaticMarkup(<SecaoContratos contratos={contratos} agir={agir} ocupado={false} />);
    expect(html).toContain('Vença 5 lutas contra monstros');
    expect(html).toContain('Derrote 3× Rato da Floresta');
    expect(html).toContain('Entregue 4× Osso');
    expect(html).toContain(T.contratos.entregarBotao);
    expect(html).toContain(T.contratos.emAndamento);
    expect(html).toContain(T.contratos.entregue);
    expect(html).toContain(T.contratos.materialRaro.replace(', ', ''));
  });

  it('criar uma guilda avisa o que falta (nível, ouro) e libera o botão quando há nome', () => {
    const baixo = renderToStaticMarkup(<SecaoCriar estado={estadoSem({ nivel: 3 })} agir={agir} ocupado={false} />);
    expect(baixo).toContain('Precisa do nível 10');
    const pobre = renderToStaticMarkup(<SecaoCriar estado={estadoSem({ ouro: 10 })} agir={agir} ocupado={false} />);
    expect(pobre).toContain(T.semGuilda.ouroInsuficiente);
    const ok = renderToStaticMarkup(<SecaoCriar estado={estadoSem()} agir={agir} ocupado={false} />);
    expect(ok).toContain(T.semGuilda.criarBotao);
  });

  it('sem convites mostra o aviso; com convite mostra Aceitar e Recusar', () => {
    expect(renderToStaticMarkup(<SecaoConvites estado={estadoSem()} agir={agir} ocupado={false} />)).toContain(T.semGuilda.nenhumConvite);
    const com = { ...estadoSem(), convites: [{ id: 'g1', nome: 'Lobos Brancos', descricao: '', quantidadeMembros: 8, lider: 'Rex', xp: 0 }] } as unknown as EstadoDaGuilda;
    const html = renderToStaticMarkup(<SecaoConvites estado={com} agir={agir} ocupado={false} />);
    expect(html).toContain('Lobos Brancos');
    expect(html).toContain(T.opcoes.aceitar);
    expect(html).toContain(T.opcoes.recusar);
  });
});
