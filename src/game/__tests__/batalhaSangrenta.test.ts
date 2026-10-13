import { describe, it, expect } from 'vitest';
import {
  BATALHA_SANGRENTA,
  NIVEL_BATALHA_SANGRENTA,
  conferirEntradaBatalha,
  diaDeBrasilia,
  estrelaDaBatalha,
  gastarTentativa,
  montarOndas,
  recompensaDaBatalha,
  sementeDaOnda,
  tentativasRestantes,
} from '@/game/batalhaSangrenta';
import { DADOS_CACADA_MAP } from '@/rules/cacada';

/** Regras puras da Provação de Batalha Sangrenta (decididas em 13/10/2026). */
describe('Batalha Sangrenta: regras', () => {
  it('o dia vale em Brasília (UTC−3)', () => {
    expect(diaDeBrasilia(new Date('2026-10-13T02:59:00Z'))).toBe('2026-10-12');
    expect(diaDeBrasilia(new Date('2026-10-13T03:00:00Z'))).toBe('2026-10-13');
  });

  it('3 tentativas por dia, e o contador zera quando o dia muda', () => {
    const dia1 = new Date('2026-10-13T15:00:00Z');
    let estado = undefined as ReturnType<typeof gastarTentativa> | undefined;
    expect(tentativasRestantes(estado, dia1)).toBe(3);
    estado = gastarTentativa(estado, dia1);
    estado = gastarTentativa(estado, dia1);
    expect(tentativasRestantes(estado, dia1)).toBe(1);
    estado = gastarTentativa(estado, dia1);
    expect(tentativasRestantes(estado, dia1)).toBe(0);
    expect(conferirEntradaBatalha(25, estado, dia1)).toEqual({ ok: false, motivo: 'semTentativas' });
    const dia2 = new Date('2026-10-14T15:00:00Z');
    expect(tentativasRestantes(estado, dia2)).toBe(3);
    expect(gastarTentativa(estado, dia2)).toEqual({ dia: '2026-10-14', tentativas: 1 });
  });

  it('pede o nível da vitrine (20)', () => {
    expect(NIVEL_BATALHA_SANGRENTA).toBe(20);
    const hoje = new Date('2026-10-13T15:00:00Z');
    expect(conferirEntradaBatalha(19, undefined, hoje)).toEqual({ ok: false, motivo: 'nivelInsuficiente' });
    expect(conferirEntradaBatalha(20, undefined, hoje)).toEqual({ ok: true });
  });

  it('a estrela é a mais alta que o jogador liberou na Caçada', () => {
    expect(estrelaDaBatalha(20, [])).toBe(1); // sem monstro-chave vencido, só a 1★ está aberta
    expect(estrelaDaBatalha(20, [1, 2, 3, 4, 5])).toBe(6);
    expect(estrelaDaBatalha(30, [1, 2, 3, 4, 5, 6, 7, 8])).toBe(9);
  });

  it('5 ondas: 4 comuns e o chefe por último (o monstro-chave da estrela)', () => {
    const ondas = montarOndas(6, 12345);
    expect(ondas).toHaveLength(BATALHA_SANGRENTA.ondas);
    expect(ondas.map((o) => o.chefe)).toEqual([false, false, false, false, true]);
    for (const o of ondas) expect(DADOS_CACADA_MAP[o.monstroId].estrela).toBe(6);
    expect(DADOS_CACADA_MAP[ondas[4].monstroId].chave).toBe(true);
    expect(ondas.slice(0, 4).every((o) => !DADOS_CACADA_MAP[o.monstroId].chave)).toBe(true);
    expect(new Set(ondas.slice(0, 4).map((o) => o.monstroId)).size).toBe(4); // sem repetir
  });

  it('é determinística pela semente e muda com ela', () => {
    expect(montarOndas(6, 99)).toEqual(montarOndas(6, 99));
    const varias = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => montarOndas(6, s).map((o) => o.monstroId).join()));
    expect(varias.size).toBeGreaterThan(1);
  });

  it('na 9★ (sem monstro-chave) o chefe é um dos monstros da estrela; na 1★ há só 3 comuns e eles se repetem', () => {
    const nove = montarOndas(9, 7);
    expect(DADOS_CACADA_MAP[nove[4].monstroId].estrela).toBe(9);
    expect(nove[4].chefe).toBe(true);
    const um = montarOndas(1, 7);
    expect(um).toHaveLength(5);
    expect(um.slice(0, 4).every((o) => DADOS_CACADA_MAP[o.monstroId].estrela === 1 && !DADOS_CACADA_MAP[o.monstroId].chave)).toBe(true);
  });

  it('recompensa: 1 por onda vencida, +3 do chefe (até 8) e 1 da subclasse só com chefe e subclasse', () => {
    expect(recompensaDaBatalha(5, true, true)).toEqual({ fragmentosAlma: 8, fragmentosSubclasse: 1 });
    expect(recompensaDaBatalha(5, true, false)).toEqual({ fragmentosAlma: 8, fragmentosSubclasse: 0 });
    expect(recompensaDaBatalha(3, false, true)).toEqual({ fragmentosAlma: 3, fragmentosSubclasse: 0 });
    expect(recompensaDaBatalha(0, false, true)).toEqual({ fragmentosAlma: 0, fragmentosSubclasse: 0 });
  });

  it('cada onda tem a sua semente', () => {
    const sementes = [0, 1, 2, 3, 4].map((i) => sementeDaOnda(555, i));
    expect(new Set(sementes).size).toBe(5);
    expect(sementes.every((s) => s >= 0)).toBe(true);
  });
});
