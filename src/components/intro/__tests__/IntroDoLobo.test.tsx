import React from 'react';
import { existsSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));
vi.mock('@/lib/audio/motor', () => ({ definirMusica: vi.fn() }));

import { IntroDoLobo, VIDEO_DA_INTRO } from '@/components/intro/IntroDoLobo';
import { TEXTOS_DA_INTRO as T } from '@/rules/textosDaIntro';
import type { CharacterDocument } from '@/server/characterService';

describe('IntroDoLobo', () => {
  it('começa pelo vídeo da introdução (que existe em public), sem botão de pular e sem luta', () => {
    const html = renderToStaticMarkup(<IntroDoLobo personagem={{ uid: 'u1', nome: 'Novato', nivel: 1 } as unknown as CharacterDocument} />);
    expect(existsSync(`public${VIDEO_DA_INTRO}`)).toBe(true);
    expect(html).toContain(`src="${VIDEO_DA_INTRO}"`);
    expect(html).toMatch(/playsinline/i);
    expect(html).not.toContain(T.pular);
    expect(html).not.toContain(T.continuar);
  });
});
