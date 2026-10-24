import { describe, it, expect } from 'vitest';
import { temOfensa } from '@/rules/nomesProibidos';
import { validarDescricaoDaGuilda, validarNomeDaGuilda } from '@/rules/guilda';

describe('Filtro de ofensas pesadas (6.5-13)', () => {
  it('pega as ofensas mesmo com maiúsculas, acentos, números no lugar de letras, letras repetidas e espaços', () => {
    for (const nome of ['Caralho', 'CARALHO', 'c4r4lh0', 'caaaralho', 'Filho da Puta', 'Puta', 'Hitler', 'H1tl3r', 'Nazista Sombrio', 'xXFuckXx', 'f u c k', 'Viado', 'pedófilo', 'Estuprador', 'nigga', 'Cu'])
      expect(temOfensa(nome), nome).toBe(true);
  });

  it('não barra palavras e nomes inocentes que contêm pedaços parecidos', () => {
    for (const nome of ['Disputa', 'Computador', 'Lucas', 'Escuta', 'Assassino', 'Scunthorpe', 'Therapist', 'Grape', 'Cockatrice', 'Pinto', 'Rolando', 'Pau-Brasil', 'Piranha', 'Macaco', 'Bicharada', 'Cucumber', 'Aragorn', 'Sombra da Noite', 'Nazareno', 'Putrefato'])
      expect(temOfensa(nome), nome).toBe(false);
  });

  it('vale no nome e na descrição da guilda', () => {
    expect(validarNomeDaGuilda('Os Caralhos')).toEqual({ ok: false, erro: expect.stringMatching(/não é permitida/) });
    expect(validarNomeDaGuilda('Os Lobos de Nocthera')).toEqual({ ok: true, nome: 'Os Lobos de Nocthera' });
    expect(validarDescricaoDaGuilda('Guilda de nazistas')).toEqual({ ok: false, erro: expect.stringMatching(/não é permitida/) });
    expect(validarDescricaoDaGuilda('Caçadores da Disputa noturna')).toEqual({ ok: true, descricao: 'Caçadores da Disputa noturna' });
  });
});
