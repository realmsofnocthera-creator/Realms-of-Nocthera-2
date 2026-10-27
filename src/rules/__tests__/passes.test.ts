import { describe, it, expect } from 'vitest';
import {
  bonusDosPasses,
  comDescontoDoPasse,
  comPasseComprado,
  DEFINICOES_DOS_PASSES,
  diasEntre,
  diasPendentes,
  diasRestantesDoPasse,
  entregasDeHoje,
  janelaDaCompra,
  passeAtivo,
  passesDoDocumento,
  presenteDosDias,
  somarDias,
} from '@/rules/passes';

const def = (id: string) => DEFINICOES_DOS_PASSES.find((d) => d.id === id)!;

describe('Passes (8.5): definições', () => {
  it('têm os preços, bônus e entregas diárias do Yuri', () => {
    expect(DEFINICOES_DOS_PASSES.map((d) => [d.id, d.precoCentavos])).toEqual([['premium', 1_999], ['deluxe', 4_999], ['invocador', 2_999], ['diamantes', 1_999]]);
    expect([def('premium').xp, def('premium').ouro, def('premium').desconto]).toEqual([10, 15, 5]);
    expect([def('deluxe').xp, def('deluxe').ouro, def('deluxe').desconto]).toEqual([20, 25, 10]);
    expect(def('premium').porDia).toEqual({ avancosDeExpedicao: 4, moedasVip: 10 });
    expect(def('deluxe').porDia).toEqual({ avancosDeExpedicao: 8, moedasVip: 20, selos: { encantado: 10 } });
    expect(def('invocador').porDia).toEqual({ selos: { desgastado: 20, encantado: 20, eternidade: 10, origem: 5 } });
    expect(def('diamantes').porDia).toEqual({ diamantes: 20 });
    expect([def('invocador').xp, def('invocador').ouro, def('invocador').desconto]).toEqual([0, 0, 0]);
  });
});

describe('Passes (8.5): os 30 dias', () => {
  it('contam a partir do dia da compra, que já vale, até a meia-noite do 30º dia', () => {
    expect(somarDias('2026-10-27', 29)).toBe('2026-11-25');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(diasEntre('2026-10-27', '2026-11-26')).toBe(30);
    const passes = comPasseComprado(undefined, 'premium', '2026-10-27');
    expect(passes.premium).toEqual({ inicio: '2026-10-27', fim: '2026-11-25' });
    expect(passeAtivo(passes.premium, '2026-10-27')).toBe(true);
    expect(passeAtivo(passes.premium, '2026-11-25')).toBe(true);
    expect(passeAtivo(passes.premium, '2026-11-26')).toBe(false);
    expect(diasRestantesDoPasse(passes.premium, '2026-10-27')).toBe(30);
    expect(diasRestantesDoPasse(passes.premium, '2026-11-25')).toBe(1);
    expect(diasRestantesDoPasse(passes.premium, '2026-11-26')).toBe(0);
  });

  it('comprar de novo antes do fim soma mais 30 dias; depois do fim recomeça hoje', () => {
    let passes = comPasseComprado(undefined, 'deluxe', '2026-10-27');
    expect(janelaDaCompra(passes.deluxe, '2026-11-10')).toEqual({ desde: '2026-11-26', ate: '2026-12-25' });
    passes = comPasseComprado(passes, 'deluxe', '2026-11-10');
    expect(passes.deluxe).toEqual({ inicio: '2026-10-27', fim: '2026-12-25' });
    expect(diasRestantesDoPasse(passes.deluxe, '2026-11-10')).toBe(46);
    // venceu: a compra começa de novo hoje e não herda a entrega antiga
    const vencido = { deluxe: { inicio: '2026-10-27', fim: '2026-11-25', entregueAte: '2026-11-25' } };
    expect(comPasseComprado(vencido, 'deluxe', '2026-12-01').deluxe).toEqual({ inicio: '2026-12-01', fim: '2026-12-30' });
    expect(janelaDaCompra(vencido.deluxe, '2026-12-01')).toEqual({ desde: '2026-12-01', ate: '2026-12-30' });
  });
});

describe('Passes (8.5): entrega diária', () => {
  it('o dia da compra já tem entrega; dias sem abrir o jogo chegam juntos; nunca passa de 30', () => {
    const base = comPasseComprado(undefined, 'premium', '2026-10-27');
    expect(diasPendentes(base.premium, '2026-10-27')).toBe(1);
    const dia1 = entregasDeHoje(base, '2026-10-27');
    expect(dia1.entregas).toHaveLength(1);
    expect(dia1.entregas[0]).toMatchObject({ dias: 1, presente: { avancosDeExpedicao: 4, moedasVip: 10 } });
    expect(dia1.passes!.premium!.entregueAte).toBe('2026-10-27');
    expect(entregasDeHoje(dia1.passes, '2026-10-27').entregas).toHaveLength(0); // mesmo dia: não repete
    // 4 dias sem abrir: 4 dias de uma vez
    const atrasado = entregasDeHoje(dia1.passes, '2026-10-31');
    expect(atrasado.entregas[0]).toMatchObject({ dias: 4, presente: { avancosDeExpedicao: 16, moedasVip: 40 } });
    // anos depois: só os dias que faltavam, até o fim
    const tudo = entregasDeHoje(atrasado.passes, '2027-03-01');
    expect(tudo.entregas[0].dias).toBe(25); // o Passe tem 30 dias e 5 já foram entregues
    expect(entregasDeHoje(tudo.passes, '2027-03-01').entregas).toHaveLength(0);
    expect(diasPendentes({ inicio: '2026-10-27', fim: '2026-11-25' }, '2026-10-20')).toBe(0); // ainda não começou
  });

  it('o presente dos dias multiplica ouro, Diamantes, Moedas VIP, Avanços e selos', () => {
    expect(presenteDosDias(def('deluxe'), 3)).toEqual({ avancosDeExpedicao: 24, moedasVip: 60, selos: { encantado: 30 } });
    expect(presenteDosDias(def('invocador'), 2)).toEqual({ selos: { desgastado: 40, encantado: 40, eternidade: 20, origem: 10 } });
    expect(presenteDosDias(def('diamantes'), 30)).toEqual({ diamantes: 600 });
  });
});

describe('Passes (8.5): bônus e desconto', () => {
  const hoje = '2026-10-28';
  const ativos = (...ids: ('premium' | 'deluxe' | 'invocador' | 'diamantes')[]) => ids.reduce((p, id) => comPasseComprado(p, id, '2026-10-27'), undefined as ReturnType<typeof comPasseComprado> | undefined);
  it('Premium e Deluxe juntos valem só o maior; os outros não dão bônus', () => {
    expect(bonusDosPasses(undefined, hoje)).toEqual({ xp: 0, ouro: 0, desconto: 0 });
    expect(bonusDosPasses(ativos('premium'), hoje)).toEqual({ xp: 10, ouro: 15, desconto: 5 });
    expect(bonusDosPasses(ativos('deluxe'), hoje)).toEqual({ xp: 20, ouro: 25, desconto: 10 });
    expect(bonusDosPasses(ativos('premium', 'deluxe'), hoje)).toEqual({ xp: 20, ouro: 25, desconto: 10 });
    expect(bonusDosPasses(ativos('invocador', 'diamantes'), hoje)).toEqual({ xp: 0, ouro: 0, desconto: 0 });
    expect(bonusDosPasses(ativos('deluxe'), '2026-11-26')).toEqual({ xp: 0, ouro: 0, desconto: 0 }); // venceu
  });

  it('o desconto arredonda para baixo e nunca zera um preço', () => {
    expect(comDescontoDoPasse(1_000, 10)).toBe(900);
    expect(comDescontoDoPasse(15, 5)).toBe(14);
    expect(comDescontoDoPasse(1, 10)).toBe(1);
    expect(comDescontoDoPasse(0, 10)).toBe(0);
    expect(comDescontoDoPasse(500, 0)).toBe(500);
  });
});

describe('Passes (8.5): documento', () => {
  it('lê com tolerância', () => {
    expect(passesDoDocumento({ premium: { inicio: '2026-10-27', fim: '2026-11-25', entregueAte: '2026-10-28' }, deluxe: { inicio: 'x', fim: '2026-11-25' }, lixo: {}, diamantes: { inicio: '2026-11-25', fim: '2026-10-27' } })).toEqual({
      premium: { inicio: '2026-10-27', fim: '2026-11-25', entregueAte: '2026-10-28' },
    });
    expect(passesDoDocumento(null)).toBeUndefined();
    expect(passesDoDocumento([])).toBeUndefined();
  });
});
