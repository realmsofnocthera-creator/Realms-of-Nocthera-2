import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { MaestriasPanel, Trilha } from '@/components/desenvolvimento/MaestriasPanel';
import { NOME_DO_GRUPO_DE_MAESTRIA, TETO_DIARIO_DE_XP, TRILHAS_DE_MAESTRIA, NIVEL_MAXIMO_DA_MAESTRIA } from '@/rules/maestrias';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { iconeDaTrilha } from '@/assets/maestriasUi';
import { ICONE_DA_CATEGORIA } from '@/assets/forjaItens';
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

  it('a trilha bloqueada (monstros) mostra "Em breve" e o ícone apagado, sem barra', () => {
    const tr = TRILHAS_DE_MAESTRIA.find((x) => x.bloqueada)!;
    expect(tr).toBeTruthy();
    const html = renderToStaticMarkup(<ul><Trilha trilha={tr} character={personagem()} dia="2026-11-12" /></ul>);
    expect(html).toContain(t.emBreve);
    expect(html).toContain(iconeDaTrilha(tr) as string);
    expect(html).not.toContain('role="progressbar"');
  });

  it('as 6 trilhas de arma usam a arte da própria categoria de arma', () => {
    const armas = TRILHAS_DE_MAESTRIA.filter((tr) => tr.grupo === 'armas');
    expect(armas).toHaveLength(6);
    for (const tr of armas) {
      const icone = iconeDaTrilha(tr);
      expect(icone, tr.id).toBe(ICONE_DA_CATEGORIA[tr.id.slice(5) as keyof typeof ICONE_DA_CATEGORIA]);
    }
    const html = render(personagem());
    for (const tr of armas) expect(html).toContain(iconeDaTrilha(tr) as string);
  });

  it('Chefes, Forja e Expedição têm o seu ícone, diferentes entre si', () => {
    const fixas = ['chefes', 'forja', 'expedicao'].map((id) => TRILHAS_DE_MAESTRIA.find((tr) => tr.id === id)!);
    const icones = fixas.map((tr) => iconeDaTrilha(tr));
    for (const i of icones) expect(i).toBeTruthy();
    expect(new Set(icones).size).toBe(3);
    for (const tr of fixas) {
      const html = renderToStaticMarkup(<ul><Trilha trilha={tr} character={personagem()} dia="2026-11-12" /></ul>);
      expect(html).toContain(iconeDaTrilha(tr) as string);
    }
  });

  it('as 13 trilhas de monstro têm cada uma o seu ícone, e a bloqueada mostra o ícone apagado', () => {
    const monstros = TRILHAS_DE_MAESTRIA.filter((tr) => tr.grupo === 'monstros');
    expect(monstros).toHaveLength(13);
    const icones = monstros.map((tr) => iconeDaTrilha(tr));
    for (const i of icones) expect(i).toBeTruthy();
    expect(new Set(icones).size).toBe(13);
    const html = renderToStaticMarkup(<ul><Trilha trilha={monstros[0]} character={personagem()} dia="2026-11-12" /></ul>);
    expect(html).toContain(iconeDaTrilha(monstros[0]) as string);
    expect(html).toContain('opacity:0.6');
    expect(html).not.toContain(KIT_DA_FORJA.proibido);
    expect(html).toContain(t.emBreve);
  });

  it('mostra os 10 marcos e acende os já alcançados', () => {
    const tr = TRILHAS_DE_MAESTRIA.find((x) => !x.bloqueada)!;
    const vazio = renderToStaticMarkup(<ul><Trilha trilha={tr} character={personagem()} dia="2026-11-12" /></ul>);
    expect(vazio).toContain(`aria-label="${textoDaFicha(t.marcos, { n: 0, max: 10 })}"`);
    expect(vazio.match(/bg-\[#EDB44C\]"/g) ?? []).toHaveLength(0);
    const alto = renderToStaticMarkup(<ul><Trilha trilha={tr} character={personagem({ maestrias: { [tr.id]: { xp: 900000, dia: '2000-01-01', xpNoDia: 0 } } })} dia="2026-11-12" /></ul>);
    expect(alto).toMatch(/aria-label="Marcos alcançados: [1-9]\d* de 10"/);
    expect(alto.match(/h-\[1\.6cqw\] border border-\[#05070D\] bg-\[#EDB44C\]/g)?.length ?? 0).toBeGreaterThan(0);
  });
});

