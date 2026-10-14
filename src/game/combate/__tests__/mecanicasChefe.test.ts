import { describe, it, expect } from 'vitest';
import {
  atualizarMecanicaNoFimDaRodada,
  bonusDanoContraAMecanica,
  bonusDanoDaMecanica,
  criarEstadoMecanica,
  escolherAcaoMecanica,
  estadoDoCiclo,
  fatiaOfensivaPercentual,
  iniciarMecanica,
  InfoDaRodada,
  investidaInterrompida,
  MECANICAS_PARAMETROS,
} from '../mecanicasChefe';
import type { Attributes } from '@/rules/attributes';

const attrs = (o: Partial<Attributes>): Attributes => ({ vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0, ...o });
const ctx = (sorteios: number[] = [], extra: Partial<Parameters<typeof escolherAcaoMecanica>[1]> = {}) => ({
  sorteio: (i: number) => sorteios[i] ?? 0,
  alvo: { atributos: attrs({ forca: 10, vigor: 10 }) },
  ...extra,
});
/** Faz N ataques do chefe e devolve a ação de cada um (undefined = ataque básico). */
const ataques = (id: Parameters<typeof criarEstadoMecanica>[0], n: number, c = ctx()) => {
  const e = criarEstadoMecanica(id);
  return Array.from({ length: n }, () => escolherAcaoMecanica(e, c)?.nome);
};

const info = (o: Partial<InfoDaRodada> = {}): InfoDaRodada => ({
  rodada: 1,
  chefe: { nome: 'Chefe', hpMax: 1000 },
  personagem: { nome: 'Heroi', hpMax: 1000 },
  danoSofridoDoChefe: 0,
  perdaDeVidaDoPersonagem: 0,
  curaRecebidaPeloPersonagem: 0,
  criticosDoPersonagem: { golpes: 0, dano: 0 },
  sorteio: () => 0,
  ...o,
});

describe('Mecânicas dos chefes do Guerreiro', () => {
  it('Astaroth, Caos Imprevisível: a cada 3 ataques sorteia uma entre três ações', () => {
    expect(ataques('caosImprevisivel', 6, ctx([0]))).toEqual([undefined, undefined, 'Golpe Devastador', undefined, undefined, 'Golpe Devastador']);
    expect(ataques('caosImprevisivel', 3, ctx([40, 50]))[2]).toBe('Explosão Elemental');
    expect(ataques('caosImprevisivel', 3, ctx([90]))[2]).toBe('Recuperação Caótica');
    const cura = escolherAcaoMecanica({ ...criarEstadoMecanica('caosImprevisivel'), ataques: 2 }, ctx([90]));
    expect(cura?.efeito.curaPercentualHpMax).toBe(MECANICAS_PARAMETROS.caosImprevisivel.recuperacaoCuraPercentualHpMax);
    const explosao = escolherAcaoMecanica({ ...criarEstadoMecanica('caosImprevisivel'), ataques: 2 }, ctx([40, 0]));
    expect(['fogo', 'gelo', 'relampago']).toContain(explosao?.efeito.elemento);
  });

  it('Zephyron, Convergência Arcana: com 3 acúmulos lança uma combinação de dois elementos', () => {
    expect(ataques('convergenciaArcana', 3, ctx([0]))[2]).toBe('Convergência: Fogo e Relâmpago');
    expect(ataques('convergenciaArcana', 3, ctx([30]))[2]).toBe('Convergência: Gelo e Sombrio');
    const gelo = escolherAcaoMecanica({ ...criarEstadoMecanica('convergenciaArcana'), ataques: 2 }, ctx([30]));
    expect(gelo?.efeito.efeitosNoAlvo?.map((d) => d.tipo)).toEqual(['enfraquecimento', 'lentidao']);
    expect(ataques('convergenciaArcana', 1, ctx([30]))[0]).toBeUndefined();
  });

  it('Thundrak, Investida Imparável: a cada 4 ataques; um efeito de interrupção no chefe diminui o impacto', () => {
    expect(ataques('investidaImparavel', 8)).toEqual([undefined, undefined, undefined, 'Investida Imparável', undefined, undefined, undefined, 'Investida Imparável']);
    const imparavel = escolherAcaoMecanica({ ...criarEstadoMecanica('investidaImparavel'), ataques: 3 }, ctx());
    expect(imparavel?.efeito.percentualDano).toBe(MECANICAS_PARAMETROS.investidaImparavel.danoPercentual);
    expect(imparavel?.efeito.efeitosNoAlvo?.[0]).toMatchObject({ tipo: 'reducaoDefesa' });
    const debuffs = [{ tipo: 'enfraquecimento' as const, percentual: 20, rodadasRestantes: 2 }];
    expect(investidaInterrompida(debuffs)).toBe(true);
    expect(investidaInterrompida([{ tipo: 'enfraquecimento', percentual: 20, rodadasRestantes: 0 }])).toBe(false);
    expect(investidaInterrompida([{ tipo: 'pontoFraco', percentual: 10, rodadasRestantes: 1 }])).toBe(false);
    const interrompida = escolherAcaoMecanica({ ...criarEstadoMecanica('investidaImparavel'), ataques: 3 }, ctx([], { debuffsDoChefe: debuffs }));
    expect(interrompida?.nome).toBe('Investida Interrompida');
    expect(interrompida?.efeito.percentualDano).toBeLessThan(imparavel!.efeito.percentualDano!);
    expect(interrompida?.efeito.efeitosNoAlvo).toBeUndefined();
  });

  it('Gorvath, Fúria Contida: acumula fúria ao sofrer dano, entra em frenesi e depois fica vulnerável', () => {
    const e = criarEstadoMecanica('furiaContida');
    const r = (dano: number) => atualizarMecanicaNoFimDaRodada(e, info({ danoSofridoDoChefe: dano, chefe: { nome: 'Gorvath', hpMax: 1000 } })).mensagens;
    expect(r(100)).toEqual([]); // 10% da vida = 30 de fúria
    expect(e.furia).toBe(30);
    expect(bonusDanoDaMecanica(e)).toBe(0);
    expect(r(250)).toHaveLength(1); // +75 = 105 -> limite 100: frenesi
    expect(e.furia).toBe(100);
    expect(e.frenesiRestante).toBe(2);
    expect(bonusDanoDaMecanica(e)).toBe(40);
    expect(r(500)).toEqual([]); // dano durante o frenesi não soma fúria
    expect(e.frenesiRestante).toBe(1);
    const fim = r(0);
    expect(fim[0]).toContain('vulnerável');
    expect(e).toMatchObject({ furia: 0, frenesiRestante: 0, vulneravelRestante: 2 });
    expect(bonusDanoDaMecanica(e)).toBe(0);
    expect(bonusDanoContraAMecanica(e)).toBe(25);
    r(0);
    r(0);
    expect(bonusDanoContraAMecanica(e)).toBe(0);
    r(100);
    expect(e.furia).toBe(30); // volta a acumular
  });

  it('Veredar, Balança do Julgamento: pune a build extrema, não a equilibrada', () => {
    expect(fatiaOfensivaPercentual(attrs({ forca: 90, vigor: 10 }))).toBe(90);
    expect(fatiaOfensivaPercentual(attrs({}))).toBe(50);
    const sentenca = (a: Partial<Attributes>) => ataques('balancaDoJulgamento', 3, ctx([], { alvo: { atributos: attrs(a) } }))[2];
    expect(sentenca({ forca: 90, vigor: 10 })).toBe('Sentença: Excesso de Ataque');
    expect(sentenca({ forca: 10, vigor: 50, vitalidade: 40 })).toBe('Sentença: Excesso de Defesa');
    expect(sentenca({ forca: 55, vigor: 25, vitalidade: 20 })).toBe('Sentença: Equilíbrio');
    const atk = escolherAcaoMecanica({ ...criarEstadoMecanica('balancaDoJulgamento'), ataques: 2 }, ctx([], { alvo: { atributos: attrs({ forca: 90, vigor: 10 }) } }));
    expect(atk?.efeito.efeitosNoAlvo?.[0]).toMatchObject({ tipo: 'enfraquecimento' });
    const def = escolherAcaoMecanica({ ...criarEstadoMecanica('balancaDoJulgamento'), ataques: 2 }, ctx([], { alvo: { atributos: attrs({ forca: 10, vigor: 50, vitalidade: 40 }) } }));
    expect(def?.efeito.efeitosNoAlvo?.[0]).toMatchObject({ tipo: 'reducaoDefesa' });
  });
});

describe('Mecânicas dos chefes 6 a 10 do Guerreiro', () => {
  const rodadas = (id: Parameters<typeof criarEstadoMecanica>[0], n: number, f: (r: number) => Partial<InfoDaRodada>) => {
    const e = criarEstadoMecanica(id);
    const efeitos = Array.from({ length: n }, (_, k) => atualizarMecanicaNoFimDaRodada(e, info({ rodada: k + 1, ...f(k + 1) })));
    return { e, efeitos };
  };

  it('Selvara, Destino Giratório: a cada 2 rodadas a roda sorteia Fortuna, Infortúnio ou Reversão', () => {
    const fortuna = rodadas('destinoGiratorio', 2, () => ({ sorteio: () => 0 }));
    expect(fortuna.efeitos[0].mensagens).toEqual([]);
    expect(fortuna.efeitos[1].debuffsNoChefe).toEqual([{ tipo: 'reducaoDefesa', percentual: 30, rodadas: 2 }]);
    const infortunio = rodadas('destinoGiratorio', 2, () => ({ sorteio: () => 40 }));
    expect(infortunio.efeitos[1].debuffsNoPersonagem?.map((d) => d.tipo)).toEqual(['enfraquecimento', 'exaustao']);
    const reversao = rodadas('destinoGiratorio', 2, () => ({ sorteio: () => 90 }));
    expect(reversao.e.reversaoRestante).toBe(4);
  });

  it('Selvara, Reversão: a próxima cura do personagem vira dano; sem cura, a Reversão expira', () => {
    const e = criarEstadoMecanica('destinoGiratorio');
    e.reversaoRestante = 4;
    const ef = atualizarMecanicaNoFimDaRodada(e, info({ rodada: 3, curaRecebidaPeloPersonagem: 100 }));
    expect(ef.danoAoPersonagem).toBe(200);
    expect(ef.mensagens[0]).toContain('Reversão');
    expect(e.reversaoRestante).toBe(0);
    const e2 = criarEstadoMecanica('destinoGiratorio');
    e2.reversaoRestante = 2;
    expect(atualizarMecanicaNoFimDaRodada(e2, info({ rodada: 1 })).danoAoPersonagem).toBeUndefined();
    atualizarMecanicaNoFimDaRodada(e2, info({ rodada: 3 }));
    expect(e2.reversaoRestante).toBe(0);
  });

  it('Nekrath, Ceifador de Almas: cada 20% da vida perdida é uma alma; com 3 almas cura o chefe e fortalece o próximo ataque', () => {
    const e = criarEstadoMecanica('ceifadorDeAlmas');
    const r = (perda: number) => atualizarMecanicaNoFimDaRodada(e, info({ perdaDeVidaDoPersonagem: perda, chefe: { nome: 'Nekrath', hpMax: 1000 } }));
    expect(r(150).mensagens).toEqual([]); // 15% não chega
    expect(e.almas).toBe(0);
    expect(r(100).mensagens).toHaveLength(1); // 25% acumulado: 1 alma
    expect(e.almas).toBe(1);
    expect(r(450).mensagens).toHaveLength(3); // +45%: mais 2 almas (3 no total) e a colheita
    expect(e.almas).toBe(0);
    expect(e.proximoAtaqueFortalecido).toBe(true);
    // a cura vem junto com a terceira alma
    const e2 = criarEstadoMecanica('ceifadorDeAlmas');
    const ef = atualizarMecanicaNoFimDaRodada(e2, info({ perdaDeVidaDoPersonagem: 600, chefe: { nome: 'Nekrath', hpMax: 1000 } }));
    expect(ef.curaDoChefe).toBe(150);
    expect(e2.proximoAtaqueFortalecido).toBe(true);
    // o ataque fortalecido vale para um ataque só
    escolherAcaoMecanica(e2, ctx());
    expect(bonusDanoDaMecanica(e2)).toBe(50);
    escolherAcaoMecanica(e2, ctx());
    expect(bonusDanoDaMecanica(e2)).toBe(0);
  });

  it('Belzareth, Pacto Profano: sorteia a maldição da luta e cada uma muda uma regra', () => {
    const sorteia = (valor: number) => {
      const e = criarEstadoMecanica('pactoProfano');
      const inicio = iniciarMecanica(e, { nomeDoChefe: 'Belzareth', sorteio: () => valor });
      return { e, inicio };
    };
    const ruina = sorteia(0);
    expect(ruina.e.pacto).toBe(0);
    expect(ruina.inicio.mensagens[0]).toContain('Pacto da Ruína');
    expect(ruina.inicio.debuffsNoPersonagem?.[0]).toMatchObject({ tipo: 'cicatrizacao', percentual: 40 });
    const sangue = sorteia(50);
    expect(sangue.e.pacto).toBe(1);
    expect(sangue.inicio.debuffsNoPersonagem).toBeUndefined();
    const muralha = sorteia(99);
    expect(muralha.e.pacto).toBe(2);
    // Pacto do Sangue: o crítico devolve 10% do dano dele
    const ef1 = atualizarMecanicaNoFimDaRodada(sangue.e, info({ criticosDoPersonagem: { golpes: 1, dano: 300 } }));
    expect(ef1.danoAoPersonagem).toBe(30);
    expect(atualizarMecanicaNoFimDaRodada(criarEstadoMecanica('pactoProfano'), info({ criticosDoPersonagem: { golpes: 1, dano: 300 } })).danoAoPersonagem).toBeUndefined();
    // Pacto da Muralha: 25% do dano que o chefe recebe vira escudo
    const ef2 = atualizarMecanicaNoFimDaRodada(muralha.e, info({ danoSofridoDoChefe: 400 }));
    expect(ef2.escudoDoChefe).toBe(100);
  });

  it('Kolossar, Colapso Estrutural: uma parte exposta por fase; sem dano suficiente em 3 rodadas, vem o colapso', () => {
    const e = criarEstadoMecanica('colapsoEstrutural');
    const r = (dano: number, rodada: number) => atualizarMecanicaNoFimDaRodada(e, info({ rodada, danoSofridoDoChefe: dano, chefe: { nome: 'Kolossar', hpMax: 1000 } }));
    expect(r(10, 1).mensagens[0]).toContain('expõe o núcleo');
    r(10, 2);
    const fim = r(10, 3); // 30 de 80 (8%): não bastou
    expect(fim.mensagens.some((m) => m.includes('colapso vem aí'))).toBe(true);
    expect(fim.mensagens.some((m) => m.includes('expõe os braços'))).toBe(true);
    expect(e.colapsoPendente).toBe(true);
    expect(e.parte).toBe(1);
    // o ataque seguinte é o colapso, uma vez só
    const colapso = escolherAcaoMecanica(e, ctx());
    expect(colapso?.nome).toBe('Colapso Estrutural');
    expect(colapso?.efeito.percentualDano).toBe(350);
    expect(escolherAcaoMecanica(e, ctx())).toBeUndefined();
    // braços: 6% = 60; com 70 de dano na fase o colapso é evitado
    r(30, 4);
    r(30, 5);
    const evitado = r(10, 6);
    expect(evitado.mensagens.some((m) => m.includes('evitado'))).toBe(true);
    expect(e.colapsoPendente).toBe(false);
    expect(e.parte).toBe(2);
  });

  it('Aetherion, Ciclo da Existência: Criação, Expansão, Declínio e Renascimento, 2 rodadas cada', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(estadoDoCiclo)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 0]);
    const e = criarEstadoMecanica('cicloDaExistencia');
    const hp = { chefe: { nome: 'Aetherion', hpMax: 1000 } };
    const r1 = atualizarMecanicaNoFimDaRodada(e, info({ rodada: 1, ...hp }));
    expect(r1.escudoDoChefe).toBe(150); // Criação: escudo
    expect(bonusDanoContraAMecanica(e)).toBe(-10);
    expect(bonusDanoDaMecanica(e)).toBe(0);
    const r2 = atualizarMecanicaNoFimDaRodada(e, info({ rodada: 2, ...hp })); // entra em Expansão
    expect(r2.mensagens[0]).toContain('Expansão');
    expect(bonusDanoDaMecanica(e)).toBe(30);
    atualizarMecanicaNoFimDaRodada(e, info({ rodada: 3, ...hp }));
    const r4 = atualizarMecanicaNoFimDaRodada(e, info({ rodada: 4, ...hp })); // entra em Declínio
    expect(r4.debuffsNoPersonagem?.map((d) => d.tipo)).toEqual(['exaustao', 'reducaoDefesa']);
    expect(bonusDanoContraAMecanica(e)).toBe(25); // janela de vulnerabilidade
    atualizarMecanicaNoFimDaRodada(e, info({ rodada: 5, ...hp }));
    const r6 = atualizarMecanicaNoFimDaRodada(e, info({ rodada: 6, ...hp })); // Renascimento
    expect(r6.curaDoChefe).toBe(120);
    expect(bonusDanoContraAMecanica(e)).toBe(15);
    atualizarMecanicaNoFimDaRodada(e, info({ rodada: 7, ...hp }));
    const r8 = atualizarMecanicaNoFimDaRodada(e, info({ rodada: 8, ...hp })); // reinicia em Criação
    expect(r8.escudoDoChefe).toBe(150);
    expect(estadoDoCiclo(e.rodada)).toBe(0);
  });
});
