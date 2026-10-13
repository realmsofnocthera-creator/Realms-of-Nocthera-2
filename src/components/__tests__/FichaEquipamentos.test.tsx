import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FichaEquipamentoModal, FichaResumoEquipamento, FichaSlotsEquipamento } from '@/components/ficha/FichaEquipamentos';
import { FichaSidebar } from '@/components/ficha/FichaSidebar';
import type { CharacterDocument } from '@/server/characterService';

const arma = { id: 'w1', baseId: 'lamina-da-geada', categoria: 'espadaGrande', atributo: 'sorte', pontos: 12, reforjas: 0, criadaEm: '' };
const elmo = { id: 'p1', pecaId: 'lobo-cinzento-elmo', atributo: 'arcano', pontos: 3, reforjas: 0, xp: 0, criadaEm: '' };

const vazio = { armas: [arma], armaduras: [elmo], equipamento: { armaId: null, armadura: {} } } as unknown as CharacterDocument;
const peitoral = { id: 'p2', pecaId: 'rato-da-floresta-peitoral', atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '' };
const equipado = {
  armas: [arma], armaduras: [elmo, peitoral], equipamento: { armaId: 'w1', armadura: { elmo: 'p1', peitoral: 'p2' } },
  bonusEquipamento: { vigor: 0, sorte: 12, forca: 23, vitalidade: 0, arcano: 3, inteligencia: 0, agilidade: -3 }, mitigacaoEquipamento: 0,
} as unknown as CharacterDocument;

describe('Aba Equipamentos da ficha', () => {
  it('a coluna mostra os 6 espaços; vazios dizem quantos itens há', () => {
    const html = renderToStaticMarkup(<FichaSlotsEquipamento character={vazio} onAbrirSlot={() => {}} />);
    for (const n of ['Arma', 'Elmo', 'Peitoral', 'Luvas', 'Perneiras', 'Botas']) expect(html).toContain(n);
    expect(html).toContain('Arma: vazio. 1 disponíveis');
    expect(html).toContain('Peitoral: vazio. 0 disponíveis');
  });

  it('com itens equipados a coluna mostra o nome e o botão troca', () => {
    const html = renderToStaticMarkup(<FichaSlotsEquipamento character={equipado} onAbrirSlot={() => {}} />);
    expect(html).toContain('Arma: Lâmina da Geada. Trocar');
    expect(html).toContain('Elmo: Elmo de Lobo Cinzento. Trocar');
  });

  it('o resumo sem nada equipado orienta o jogador; equipado mostra bônus, elemento, status e habilidades', () => {
    expect(renderToStaticMarkup(<FichaResumoEquipamento character={vazio} />)).toContain('Nada equipado');
    const html = renderToStaticMarkup(<FichaResumoEquipamento character={equipado} />);
    expect(html).toContain('Elemento: Gelo');
    expect(html).toContain('Status: Sangramento');
    expect(html).toContain('Reforço de Ataque'); // já vale no combate
    expect(html).toContain('Extensor de Agilidade'); // Agilidade em porcentagem, já vale
    expect(html).not.toContain('ainda não valem no combate'); // todas as habilidades deste equipamento valem
  });

  it('a escolha lista os itens do espaço, com Equipar e Desequipar', () => {
    const html = renderToStaticMarkup(<FichaEquipamentoModal character={equipado} slot="arma" onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Lâmina da Geada');
    expect(html).toContain('Desequipar');
    expect(html).not.toContain('>Equipar<');
    const livre = renderToStaticMarkup(<FichaEquipamentoModal character={vazio} slot="arma" onClose={() => {}} />);
    expect(livre).toContain('>Equipar<');
    const semItens = renderToStaticMarkup(<FichaEquipamentoModal character={vazio} slot="botas" onClose={() => {}} />);
    expect(semItens).toContain('nenhuma peça para botas');
  });

  it('na barra lateral, Equipamentos só abre quando a ficha sabe trocar de aba', () => {
    const fechada = renderToStaticMarkup(<FichaSidebar />);
    expect(fechada.match(/aria-disabled="true"/g)).toHaveLength(3);
    const aberta = renderToStaticMarkup(<FichaSidebar aba="personagem" onMudarAba={() => {}} />);
    expect(aberta.match(/aria-disabled="true"/g)).toHaveLength(2);
    const naAba = renderToStaticMarkup(<FichaSidebar aba="equipamentos" onMudarAba={() => {}} />);
    expect(naAba).toContain('aria-current="page"');
  });
});
