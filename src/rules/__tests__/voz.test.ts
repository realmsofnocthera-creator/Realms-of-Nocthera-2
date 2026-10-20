import { describe, it, expect } from 'vitest';
import { bipDaLetra, ehIdDeVoz, IDS_DE_VOZ, letraQueSoa, pausaDepois, VOZES } from '@/rules/voz';
import { validarCena, vozDaTela, cenaEmBranco, type CenaDados } from '@/rules/cena';

describe('Vozes "bip"', () => {
  it('as predefinições têm números razoáveis', () => {
    expect(IDS_DE_VOZ).toEqual(expect.arrayContaining(['masculina-grave', 'masculina', 'feminina', 'feminina-fina', 'crianca', 'idoso', 'monstro', 'narrador']));
    for (const id of IDS_DE_VOZ) {
      const v = VOZES[id];
      expect(v.frequencia).toBeGreaterThanOrEqual(40);
      expect(v.frequencia).toBeLessThanOrEqual(2000);
      expect(v.volume).toBeGreaterThan(0);
      expect(v.volume).toBeLessThanOrEqual(1);
      expect(v.cadaLetras).toBeGreaterThanOrEqual(1);
      expect(v.duracaoMs).toBeGreaterThan(0);
    }
    expect(VOZES['masculina-grave'].frequencia).toBeLessThan(VOZES.masculina.frequencia);
    expect(VOZES.feminina.frequencia).toBeLessThan(VOZES['feminina-fina'].frequencia);
    expect(VOZES.monstro.frequencia).toBeLessThan(VOZES['masculina-grave'].frequencia);
  });

  it('só letras e números soam; toca a cada N letras; a variação fica no intervalo', () => {
    expect(letraQueSoa('á')).toBe(true);
    expect(letraQueSoa('7')).toBe(true);
    expect(letraQueSoa(' ')).toBe(false);
    expect(letraQueSoa(',')).toBe(false);
    const v = VOZES.masculina; // a cada 2 letras
    expect(bipDaLetra(v, 'a', 1, 0.5)).toMatchObject({ frequencia: v.frequencia, duracaoMs: v.duracaoMs });
    expect(bipDaLetra(v, 'b', 2, 0.5)).toBeNull();
    expect(bipDaLetra(v, 'c', 3, 0.5)).not.toBeNull();
    expect(bipDaLetra(v, ' ', 3, 0.5)).toBeNull();
    const alto = bipDaLetra(v, 'a', 1, 1)!.frequencia;
    const baixo = bipDaLetra(v, 'a', 1, 0)!.frequencia;
    expect(alto / v.frequencia).toBeCloseTo(Math.pow(2, v.variacao / 12), 5);
    expect(baixo / v.frequencia).toBeCloseTo(Math.pow(2, -v.variacao / 12), 5);
    const m = bipDaLetra(VOZES.monstro, 'a', 1, 0.5)!;
    expect(m.frequenciaFinal).toBeLessThan(m.frequencia); // o monstro "desce"
  });

  it('pausas depois da pontuação', () => {
    expect(pausaDepois('.')).toBeGreaterThan(pausaDepois(','));
    expect(pausaDepois(',')).toBeGreaterThan(0);
    expect(pausaDepois('a')).toBe(0);
    expect(ehIdDeVoz('monstro')).toBe(true);
    expect(ehIdDeVoz('toString')).toBe(false);
  });

  it('cena: aceita vozes válidas (personagem, jogador e narração), recusa desconhecidas, "nenhuma" vira sem voz', () => {
    const c = { ...cenaEmBranco('Teste'), personagens: [{ id: 'chefe', nome: 'Chefe', voz: 'monstro' }], vozDoJogador: 'masculina', vozDaNarracao: 'narrador' };
    const v = validarCena(c);
    expect(v.ok && v.dados).toMatchObject({ vozDoJogador: 'masculina', vozDaNarracao: 'narrador', personagens: [{ voz: 'monstro' }] });
    expect(validarCena({ ...c, vozDoJogador: 'gritante' }).ok).toBe(false);
    expect(validarCena({ ...c, personagens: [{ id: 'chefe', nome: 'Chefe', voz: 'xyz' }] }).ok).toBe(false);
    const sem = validarCena({ ...c, vozDaNarracao: 'nenhuma' });
    expect(sem.ok && sem.dados).not.toHaveProperty('vozDaNarracao');
  });

  it('vozDaTela: personagem, jogador, narração ou silêncio', () => {
    const c: CenaDados = { ...cenaEmBranco('Teste'), personagens: [{ id: 'chefe', nome: 'Chefe', voz: 'monstro' }, { id: 'mudo', nome: 'Mudo' }], vozDoJogador: 'feminina' };
    expect(vozDaTela(c, { tipo: 'fala', personagem: 'chefe', texto: 'x' })).toBe(VOZES.monstro);
    expect(vozDaTela(c, { tipo: 'fala', personagem: 'jogador', texto: 'x' })).toBe(VOZES.feminina);
    expect(vozDaTela(c, { tipo: 'fala', personagem: 'mudo', texto: 'x' })).toBeNull();
    expect(vozDaTela(c, { tipo: 'narracao', texto: 'x' })).toBeNull();
  });
});
