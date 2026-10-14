import { describe, it, expect } from 'vitest';
import {
  andarAtual,
  conferirEntradaTorre,
  diamantesDoAndar,
  ehAndarDeChefe,
  essenciaDoAndar,
  estrelaDoAndar,
  fragmentosDeAscensaoDoAndar,
  identidadeDoAndar,
  montarMonstroDaTorre,
  nivelDeReferenciaDoAndar,
  proximoChefe,
  recompensaDoAndar,
  TORRE,
  xpDoAndar,
} from '../torreCelestial';
import { CHEFES_TORRE } from '@/rules/torreChefes';
import { CUSTO_REFORCO_ESSENCIA } from '@/rules/progressaoHabilidade';
import { ASCENSAO_MAXIMA } from '@/rules/progressaoHabilidade';

describe('Torre Celestial (regras)', () => {
  it('são 300 andares e 30 chefes únicos, um a cada 10 andares', () => {
    expect(TORRE.andares).toBe(300);
    expect(CHEFES_TORRE).toHaveLength(30);
    expect(CHEFES_TORRE.map((c) => c.andar)).toEqual(Array.from({ length: 30 }, (_, i) => (i + 1) * 10));
    expect(new Set(CHEFES_TORRE.map((c) => c.id)).size).toBe(30);
    expect(new Set(CHEFES_TORRE.map((c) => c.nome)).size).toBe(30);
    expect(CHEFES_TORRE[0].nome).toBe('Rikk, o Rato Carniceiro');
    expect(CHEFES_TORRE[29].nome).toBe('Nihilzareth, o Deus do Eclipse Sangrento');
  });

  it('entrada: nível 5, andar atual é o seguinte ao vencido e a Torre acaba no 300', () => {
    expect(conferirEntradaTorre(4, undefined)).toEqual({ ok: false, motivo: 'nivelInsuficiente' });
    expect(conferirEntradaTorre(5, undefined)).toEqual({ ok: true, andar: 1 });
    expect(conferirEntradaTorre(5, 41)).toEqual({ ok: true, andar: 42 });
    expect(conferirEntradaTorre(30, 299)).toEqual({ ok: true, andar: 300 });
    expect(conferirEntradaTorre(30, 300)).toEqual({ ok: false, motivo: 'torreCompleta' });
    expect(andarAtual(undefined)).toBe(1);
  });

  it('XP fixo de 27 por andar, só abaixo do nível 15', () => {
    expect(xpDoAndar(5)).toBe(27);
    expect(xpDoAndar(14)).toBe(27);
    expect(xpDoAndar(15)).toBe(0);
    expect(xpDoAndar(30)).toBe(0);
    // 2.700 de XP levam do nível 5 ao 15: 100 andares
    expect(27 * 100).toBe(2700);
  });

  it('essência cresce até o andar 199 e a soma completa o Reforço (nível 30)', () => {
    expect(essenciaDoAndar(1)).toBe(3);
    expect(essenciaDoAndar(10)).toBe(34);
    expect(essenciaDoAndar(199)).toBe(676);
    expect(essenciaDoAndar(200)).toBe(0);
    expect(essenciaDoAndar(300)).toBe(0);
    let soma = 0;
    for (let a = 1; a <= TORRE.andares; a++) soma += essenciaDoAndar(a);
    expect(soma).toBe(67580);
    expect(soma).toBeGreaterThanOrEqual(CUSTO_REFORCO_ESSENCIA.reduce((s, c) => s + c, 0));
    for (let a = 2; a < 200; a++) expect(essenciaDoAndar(a)).toBeGreaterThanOrEqual(essenciaDoAndar(a - 1));
  });

  it('do andar 200 ao 300 a essência vira 5 Diamantes por andar (505 no total)', () => {
    expect(diamantesDoAndar(199)).toBe(0);
    expect(diamantesDoAndar(200)).toBe(5);
    expect(diamantesDoAndar(300)).toBe(5);
    expect(diamantesDoAndar(301)).toBe(0);
    let total = 0;
    for (let a = 1; a <= TORRE.andares; a++) total += diamantesDoAndar(a);
    expect(total).toBe(505);
  });

  it('fragmento de ascensão garantido nos chefes 200, 210 … 300 (11; a Ascensão completa custa 10)', () => {
    const andares = Array.from({ length: 300 }, (_, i) => i + 1).filter((a) => fragmentosDeAscensaoDoAndar(a) > 0);
    expect(andares).toEqual([200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300]);
    expect(andares.length).toBeGreaterThanOrEqual(ASCENSAO_MAXIMA);
    expect(fragmentosDeAscensaoDoAndar(190)).toBe(0);
    expect(fragmentosDeAscensaoDoAndar(205)).toBe(0);
  });

  it('recompensa junta XP, essência, Diamantes e fragmentos do andar', () => {
    expect(recompensaDoAndar(1, 5)).toEqual({ essenciaHabilidade: 3, diamantes: 0, fragmentosAscensao: 0, xp: 27 });
    expect(recompensaDoAndar(200, 30)).toEqual({ essenciaHabilidade: 0, diamantes: 5, fragmentosAscensao: 1, xp: 0 });
  });

  it('andar de chefe a cada 10 e identidade com o chefe único', () => {
    expect(ehAndarDeChefe(10)).toBe(true);
    expect(ehAndarDeChefe(15)).toBe(false);
    expect(identidadeDoAndar(10)).toMatchObject({ chefe: true, nome: 'Rikk, o Rato Carniceiro' });
    expect(identidadeDoAndar(11).chefe).toBe(false);
    expect(proximoChefe(11)?.andar).toBe(20);
    expect(proximoChefe(300)?.andar).toBe(300);
    expect(proximoChefe(301)).toBeNull();
  });

  it('cada andar é mais difícil que o anterior (nível de referência, vida e dano sobem)', () => {
    expect(nivelDeReferenciaDoAndar(1)).toBe(2);
    expect(nivelDeReferenciaDoAndar(300)).toBe(30);
    expect(estrelaDoAndar(1)).toBe(1);
    expect(estrelaDoAndar(300)).toBe(9);
    // chefes: cada chefe é mais forte que o anterior
    for (let a = 20; a <= 300; a += 10) {
      const antes = montarMonstroDaTorre(a - 10);
      const agora = montarMonstroDaTorre(a);
      expect(agora.hp).toBeGreaterThan(antes.hp * 0.9);
    }
    const hpAndar1 = montarMonstroDaTorre(1).hp;
    const hpAndar150 = montarMonstroDaTorre(150).hp;
    const hpAndar300 = montarMonstroDaTorre(300).hp;
    expect(hpAndar150).toBeGreaterThan(hpAndar1);
    expect(hpAndar300).toBeGreaterThan(hpAndar150);
  });

  it('o monstro do andar não dá ouro nem o XP do monstro; chefe é Enfurecido e único', () => {
    const comum = montarMonstroDaTorre(7);
    expect(comum.ouroConcedido).toEqual({ min: 0, max: 0 });
    expect(comum.xpConcedido).toBe(0);
    expect(comum.chefe).toBe(false);
    const chefe = montarMonstroDaTorre(10);
    expect(chefe.chefe).toBe(true);
    expect(chefe.enfurecido).toBe(true);
    expect(chefe.nome).toBe('Rikk, o Rato Carniceiro');
    expect(chefe.efeitosAplicados).toEqual(['sangramento']);
    expect(montarMonstroDaTorre(300).efeitosAplicados).toEqual(['loucura', 'maldicao']);
    // o mesmo andar sempre dá o mesmo monstro
    expect(montarMonstroDaTorre(37)).toEqual(montarMonstroDaTorre(37));
  });
});
