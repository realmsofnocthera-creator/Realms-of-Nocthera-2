import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FichaAlmaPixel } from '@/components/ficha/FichaAlmaPixel';
import { FichaSidebar } from '@/components/ficha/FichaSidebar';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
import { COLUNAS_DA_ALMA, ESPACOS_DA_PRATELEIRA } from '@/assets/almaUi';
import { CATEGORIAS_DE_CARTA, ESPACOS_POR_CATEGORIA } from '@/rules/almas';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const t = TEXTOS_DA_FICHA.alma;
const carta = (id: string, tipo: string) => ({ id, tipo, despertar: 0, efeitos: [{ efeito: 'hp', valor: 3 }] });
const base = {
  nivel: 30,
  cartasItens: [carta('1', 'alma-mitico-1'), carta('2', 'corpo-lendario-1'), carta('3', 'alma-comum-1'), carta('4', 'mente-raro-1')],
  cartasEquipadas: ['1', '2'],
  poeiraDeAlma: 120,
  cacosDeAlma: 45,
} as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<FichaAlmaPixel character={c} onAlmaAcao={async () => ({ erro: null })} />);

describe('Aba Alma (pixel, na mesma página da ficha)', () => {
  it('tem 3 colunas (Corpo, Alma e Mente) com 3 espaços cada, e a prateleira de 5', () => {
    expect([...COLUNAS_DA_ALMA].sort()).toEqual([...CATEGORIAS_DE_CARTA].sort());
    expect(ESPACOS_DA_PRATELEIRA.centros).toHaveLength(5);
    const html = render(base);
    for (const nome of ['Corpo', 'Alma', 'Mente']) expect(html).toContain(`aria-label="Espaços de ${nome}"`);
    expect(html.match(/aria-label="Espaço \d de /g)).toHaveLength(3 * ESPACOS_POR_CATEGORIA);
    expect(html).toContain('Espaço 1 de Alma: ');
    expect(html).toContain('Espaço 2 de Alma: vazio');
    expect(html).toContain(textoDaFicha(t.cartas, { n: 4 }));
  });

  it('mostra poeira, cacos e os botões de bônus e coleção, sem abrir nenhuma janela', () => {
    const html = render(base);
    expect(html).toContain('120');
    expect(html).toContain('45');
    expect(html).toContain(t.verBonus);
    expect(html).toContain('href="/colecao?aba=alma"');
    expect(html).not.toContain('role="dialog"');
  });

  it('antes do nível 25 só avisa o nível', () => {
    const html = render({ ...base, nivel: 10 } as unknown as CharacterDocument);
    expect(html).toContain(textoDaFicha(t.bloqueada, { nivel: 25, atual: 10 }));
    expect(html).not.toContain('Espaços de Corpo');
  });

  it('na barra de abas, a Alma troca de aba na mesma página (sem abrir outra tela)', () => {
    const html = renderToStaticMarkup(<FichaSidebar aba="personagem" onMudarAba={() => {}} almaLiberada />);
    expect(html).toContain('aria-label="Alma"');
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(1);
    expect(renderToStaticMarkup(<FichaSidebar aba="alma" onMudarAba={() => {}} almaLiberada />)).toContain('aria-current="page"');
  });
});
