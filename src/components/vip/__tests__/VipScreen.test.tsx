import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BarraVip } from '@/components/vip/BarraVip';
import { VipScreen } from '@/components/vip/VipScreen';
import { RECOMPENSAS_DO_VIP, type RecompensaDoVip } from '@/rules/vipRecompensas';
import { TITULOS } from '@/rules/titulos';

describe('barra do VIP', () => {
  it('mostra o nível, o nome e os pontos VIP (1 por R$ 1), sem dinheiro e sem dizer quantos faltam, e leva à tela do VIP', () => {
    const html = renderToStaticMarkup(<BarraVip gastoCentavos={4_250} />);
    expect(html).toContain('href="/vip"');
    expect(html).toContain('VIP · Adepto');
    expect(html).toContain('42 pontos VIP');
    expect(html).not.toMatch(/R\$|Faltam|faltam/);
  });
  it('o nível máximo avisa', () => {
    expect(renderToStaticMarkup(<BarraVip gastoCentavos={300_000} />)).toContain('Nível máximo');
  });
});

describe('tela do VIP', () => {
  const tabela = RECOMPENSAS_DO_VIP as RecompensaDoVip[];
  afterEach(() => { for (const x of tabela) delete x.entrega; });
  const render = (gasto: number, resgatados: string[] = []) => renderToStaticMarkup(<VipScreen gastoCentavos={gasto} vipResgatados={resgatados} aoResgatar={vi.fn()} />);

  it('abre no nível do jogador, com as setas, os bônus e as recompensas, e nunca mostra pontos necessários nem dinheiro', () => {
    const html = render(7_500); // nível 3
    expect(html).toContain('Discípulo');
    expect(html).toContain('aria-label="Nível anterior"');
    expect(html).toContain('aria-label="Próximo nível"');
    expect(html).toContain('Seu nível');
    expect(html).toContain('+4% de XP nos combates');
    expect(html).toContain('Moldura VIP exclusiva');
    expect(html).not.toMatch(/R\$|Faltam|faltam|pontos necess/i);
    expect(html.match(/aria-label="VIP \d+"/g)).toHaveLength(11);
  });

  it('sem nada para resgatar, não aparece o baú nem o botão Resgatar', () => {
    expect(render(300_000)).not.toContain('Resgatar<');
    expect(render(300_000)).not.toContain('recompensa para resgatar');
  });

  it('com recompensa pronta, aparece o baú com o botão Resgatar embaixo das recompensas', () => {
    tabela.find((x) => x.id === 'vip-2-titulo')!.entrega = { titulo: TITULOS[0].id };
    const html = render(3_000);
    expect(html).toContain('1 recompensa para resgatar');
    expect(html).toContain('>Resgatar<');
    expect(html.indexOf('Recompensas exclusivas')).toBeLessThan(html.indexOf('>Resgatar<'));
    // depois de resgatada, o baú some
    expect(render(3_000, ['vip-2-titulo'])).not.toContain('>Resgatar<');
  });
});
