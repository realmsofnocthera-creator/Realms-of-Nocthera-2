import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationDot } from '@/components/NotificationDot';
import { NOCTHERA_THEME } from '@/theme/theme';

describe('NotificationDot Component', () => {
  it('visible=false não renderiza nada', () => {
    const html = renderToStaticMarkup(<NotificationDot visible={false} />);
    expect(html).toBe('');
  });

  it('visible=true renderiza a bolinha indicadora com token de cor do tema', () => {
    const html = renderToStaticMarkup(<NotificationDot visible={true} className="custom-class" />);
    expect(html).not.toBe('');
    expect(html).toContain('role="status"');
    expect(html).toContain('custom-class');
    // Deve conter a cor do token sem hex solto no componente
    expect(html).toContain(NOCTHERA_THEME.colors.notificationDot);
  });
});
