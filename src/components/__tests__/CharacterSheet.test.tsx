import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterSheet } from '@/components/CharacterSheet';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));

const personagem = {
  uid: 'u', nome: 'Yes', racaId: 'humano', classeId: 'samurai', avatarId: 'samurai', nivel: 30, xpAtual: 0, pontosDisponiveis: 0, ouro: 0,
  hpMax: 407, sobreescudoMax: 177, chanceCritico: 3, poderTotal: 1842,
  atributos: { vigor: 65, sorte: 10, forca: 100, vitalidade: 70, arcano: 0, inteligencia: 0, agilidade: 0 },
  habilidadesEquipadas: {}, armas: [], armaduras: [], inventario: {},
} as unknown as CharacterDocument;
const render = () => renderToStaticMarkup(<CharacterSheet character={personagem} onLogout={() => {}} userEmail="x" onEquiparItem={async () => null} />);

describe('Ficha do personagem (pixel, textos em código)', () => {
  it('mostra a identidade, as 10 linhas de atributos e o Poder Total', () => {
    const html = render();
    expect(html).toContain('Yes');
    expect(html).toContain(textoDaFicha(TEXTOS_DA_FICHA.identidade.nivel, { nivel: 30 }));
    expect(html).toContain(TEXTOS_DA_FICHA.identidade.nivelMaximo);
    const painel = html.slice(html.indexOf(`aria-label="${TEXTOS_DA_FICHA.atributos.titulo}"`));
    expect(painel.split('</ul>')[0].match(/<li /g)).toHaveLength(10);
    for (const r of ['HP', 'Sobreescudo', 'Crítico', 'Vigor', 'Sorte', 'Força', 'Vitalidade', 'Arcano', 'Inteligência', 'Agilidade']) expect(painel).toContain(r);
    expect(painel).toContain('407/407');
    expect(painel).toContain('—');
    expect(html).toContain('1.8K');
  });

  it('as abas são Personagem, Equipamentos, Emblemas e Alma (com o nível da Alma no aviso)', () => {
    const html = render();
    for (const aba of [TEXTOS_DA_FICHA.abas.personagem, TEXTOS_DA_FICHA.abas.equipamentos, TEXTOS_DA_FICHA.abas.emblemas]) expect(html).toContain(`aria-label="${aba}"`);
    expect(html).toContain('aria-label="Alma"');
  });

  it('as 7 habilidades ficam sobre os 7 quadrados do painel, sem texto escrito na arte', () => {
    const html = render();
    expect(html).toContain(`aria-label="${TEXTOS_DA_FICHA.habilidades.titulo}"`);
    const painel = html.slice(html.indexOf(`aria-label="${TEXTOS_DA_FICHA.habilidades.titulo}"`));
    expect(painel.match(/aria-haspopup="dialog"/g)).toHaveLength(7);
  });

  it('tem o banner do Desenvolvimento com o título e a frase escritos em código, e o menu da conta fechado', () => {
    const html = render();
    expect(html).toContain(TEXTOS_DA_FICHA.desenvolvimento.titulo);
    expect(html).toContain(TEXTOS_DA_FICHA.desenvolvimento.descricao);
    expect(html).toContain('href="/desenvolvimento"');
    expect(html).not.toContain('role="dialog"');
  });
});

describe('textos da ficha', () => {
  it('troca os valores do modelo', () => {
    expect(textoDaFicha(TEXTOS_DA_FICHA.abas.almaBloqueada, { nivel: 25 })).toBe('Alma (abre no nível 25)');
    expect(textoDaFicha('{a} e {b}', { a: 1 })).toBe('1 e ');
  });
});
