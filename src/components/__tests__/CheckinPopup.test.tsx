import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheckinPopup } from '@/components/checkin/CheckinPopup';
import { recompensaDoCheckin } from '@/rules/diario';
import { textoDoPresente } from '@/rules/correio';

vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));

const calendario = (feitos: number, hoje: number | null) =>
  Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const r = recompensaDoCheckin(n);
    return { dia: n, recompensa: textoDoPresente(r), especial: !!r.diamantes, feito: n <= feitos, hoje: n === hoje };
  });
const render = (estado: { feitoHoje: boolean; proximoDia: number; calendario: ReturnType<typeof calendario> }) =>
  renderToStaticMarkup(<CheckinPopup aoFechar={() => {}} tokenFresco={async () => 't'} estadoInicial={estado} />);

describe('Check-in em pop-up', () => {
  it('mostra o calendário de 30 dias, a recompensa de hoje e o botão para fazer o Check-in', () => {
    const html = render({ feitoHoje: false, proximoDia: 12, calendario: calendario(11, 12) });
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Calendário do Check-in"');
    expect(html.match(/<li /g)).toHaveLength(30);
    expect(html.match(/alt="Feito"/g)).toHaveLength(11);
    expect(html).toContain('Dia 12 de 30');
    expect(html).toContain('Fazer o Check-in');
    expect(html).not.toContain('disabled=""');
  });

  it('com o check-in de hoje feito, o botão fica desligado e mostra a recompensa de amanhã', () => {
    const html = render({ feitoHoje: true, proximoDia: 13, calendario: calendario(12, null) });
    expect(html).toContain('Check-in de hoje feito');
    expect(html).toContain('Volte amanhã');
    expect(html).toContain('Amanhã: ');
    expect(html).toContain('disabled=""');
  });

  it('o dia especial leva o aviso dos Diamantes e tem um botão de fechar', () => {
    const html = render({ feitoHoje: false, proximoDia: 7, calendario: calendario(6, 7) });
    expect(html).toContain('Diamantes');
    expect(html).toContain('aria-label="Fechar"');
  });
});
