import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { MaestriasPanel, Trilha } from '@/components/desenvolvimento/MaestriasPanel';
import { NOME_DO_GRUPO_DE_MAESTRIA, TETO_DIARIO_DE_XP, TRILHAS_DE_MAESTRIA, NIVEL_MAXIMO_DA_MAESTRIA } from '@/rules/maestrias';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';

const t = TEXTOS_DA_FICHA.maestrias;
const personagem = (extra: Record<string, unknown> = {}) => ({ classeId: 'barbaro', nivel: 30, atributos: {}, ...extra }) as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<MaestriasPanel character={c} />);
const grupos = Object.keys(NOME_DO_GRUPO_DE_MAESTRIA);

describe('Maestrias (pixel)', () => {
  it('mostra uma aba para cada grupo, com Armas aberta, e o teto diário de XP', () => {
    const html = render(personagem());
    expect(html).toContain(`aria-label="${t.grupos}"`);
    expect(html.match(/role="tab"/g)).toHaveLength(grupos.length);
    for (const nome of Object.values(NOME_DO_GRUPO_DE_MAESTRIA)) expect(html).toContain(nome);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain(textoDaFicha(t.teto, { n: TETO_DIARIO_DE_XP.toLocaleString('pt-BR') }));
    expect(html).not.toContain(t.avisoMonstros.trim());
  });

  it('lista as trilhas do grupo aberto, cada uma com a barra de progresso e o nível', () => {
    const html = render(personagem());
    const armas = TRILHAS_DE_MAESTRIA.filter((tr) => tr.grupo === 'armas');
    expect(armas.length).toBeGreaterThan(0);
    for (const tr of armas) {
      expect(html).toContain(tr.nome);
      expect(html).toContain(`aria-label="${textoDaFicha(t.progressoAria, { nome: tr.nome })}"`);
    }
    expect(html).toContain(textoDaFicha(t.nivel, { n: 0, max: NIVEL_MAXIMO_DA_MAESTRIA }));
    expect(html).toContain('width:0%');
  });

  it('uma trilha com XP mostra o nível, o progresso e o bônus', () => {
    const tr = TRILHAS_DE_MAESTRIA.find((x) => !x.bloqueada)!;
    const html = renderToStaticMarkup(<ul><Trilha trilha={tr} character={personagem({ maestrias: { [tr.id]: { xp: 5000, dia: '2000-01-01', xpNoDia: 0 } } })} dia="2026-11-12" /></ul>);
    expect(html).toContain(tr.nome);
    expect(html).toMatch(/Nv [1-9]\d*\/100/);
    expect(html).toContain('role="progressbar"');
  });

  it('a trilha bloqueada (monstros) mostra o cadeado e "Em breve", sem barra', () => {
    const tr = TRILHAS_DE_MAESTRIA.find((x) => x.bloqueada)!;
    expect(tr).toBeTruthy();
    const html = renderToStaticMarkup(<ul><Trilha trilha={tr} character={personagem()} dia="2026-11-12" /></ul>);
    expect(html).toContain(t.emBreve);
    expect(html).toContain(KIT_DA_FORJA.proibido);
    expect(html).not.toContain('role="progressbar"');
  });
});
