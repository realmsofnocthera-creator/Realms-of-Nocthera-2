import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SistemasPainel } from '@/components/mestre/SistemasPainel';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';

const sessao = (permissoes: SessaoDoPainel['permissoes']): SessaoDoPainel => ({ uid: 'u', email: 'u@test.com', papel: 'dono', nomeDoPapel: 'Dono', descricao: '', origem: 'ambiente', permissoes });

describe('SistemasPainel (renderização)', () => {
  it('mostra o estado de carregamento antes de a configuração chegar', () => {
    const html = renderToStaticMarkup(<SistemasPainel sessao={sessao(['painel.entrar', 'sistemas.gerir'])} tokenFresco={async () => 'x'} />);
    expect(html).toContain('Sistemas e manutenção');
    expect(html).toContain('Carregando');
  });
});
