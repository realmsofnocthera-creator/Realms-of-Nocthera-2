import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { calcularSobreescudoMax } from '@/game';
import {
  AplicacaoCura,
  aplicarCuras,
  calcularCura,
  processarCuraContinua,
  tentarRessurreicaoParcial,
} from '@/game/combate/efeitosCura';
import {
  DefinicaoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
} from '@/game/combate/habilidades';
import { MONSTERS_MAP } from '@/rules/monsters';

/** 1.2.4 — Catálogo, categoria Cura e restauração. */

const base = { hp: 50, hpMax: 200, sobreescudo: 0, sobreescudoMax: 40 };
const curar = (aplicacoes: AplicacaoCura[], extra: Partial<typeof base> = {}) =>
  aplicarCuras({ ...base, ...extra, aplicacoes });

describe('1.2.4 — Cura e restauração: funções puras', () => {
  it('Cura Direta: % do HP máximo, arredondando para cima e sem passar do máximo', () => {
    expect(calcularCura(200, 15)).toBe(30);
    expect(calcularCura(33, 10)).toBe(4); // 3,3 → 4
    expect(curar([{ efeito: 'curaDireta', percentualHpMax: 15 }]).hp).toBe(80);
    const cheio = curar([{ efeito: 'curaDireta', percentualHpMax: 50 }], { hp: 190 });
    expect(cheio.hp).toBe(200);
    expect(cheio.curaHp).toBe(10);
  });

  it('Cura em Excesso: cura HP e dá % do Sobreescudo máximo', () => {
    const r = curar([{ efeito: 'curaEmExcesso', percentualHpMax: 10, percentualSobreescudo: 25 }]);
    expect(r.hp).toBe(70);
    expect(r.sobreescudo).toBe(10); // 25% de 40
    expect(r.sobreescudoGanho).toBe(10);
  });

  it('Cura Crítica: só cura abaixo de 30% do HP', () => {
    const aplic: AplicacaoCura[] = [{ efeito: 'curaCritica', percentualHpMax: 20 }];
    expect(curar(aplic, { hp: 50 }).hp).toBe(90); // 25% do HP → cura 40
    expect(curar(aplic, { hp: 60 }).hp).toBe(60); // 30% exatos → não cura
    expect(curar(aplic, { hp: 60 }).aplicados).toEqual([]);
  });

  it('Limpeza: pede de 1 a 3 remoções e cura', () => {
    expect(curar([{ efeito: 'limpeza', quantidadeEfeitos: 2, percentualHpMax: 5 }]).efeitosNegativosARemover).toBe(2);
    expect(curar([{ efeito: 'limpeza', quantidadeEfeitos: 9, percentualHpMax: 0 }]).efeitosNegativosARemover).toBe(3);
    expect(curar([{ efeito: 'limpeza', quantidadeEfeitos: 0, percentualHpMax: 0 }]).efeitosNegativosARemover).toBe(1);
    expect(curar([{ efeito: 'limpeza', quantidadeEfeitos: 2, percentualHpMax: 5 }]).hp).toBe(60);
  });

  it('Cura Contínua: cura no fim de cada rodada e acaba depois de N rodadas', () => {
    let estado = curar([{ efeito: 'curaContinua', percentualHpMax: 5, duracaoRodadas: 2 }]).curaContinua;
    let hp = 50;
    let t = processarCuraContinua(estado, hp, 200);
    expect(t.cura).toBe(10);
    hp = t.hp;
    estado = t.estado;
    t = processarCuraContinua(estado, hp, 200);
    expect(t.hp).toBe(70);
    expect(t.estado).toBeUndefined();
  });

  it('Ressurreição Parcial: volta com X% ao cair a 0, uma vez só', () => {
    const preparada = curar([{ efeito: 'ressurreicaoParcial', percentualHpMax: 25 }]).ressurreicaoParcial;
    const r1 = tentarRessurreicaoParcial(preparada, 0, 200);
    expect(r1.ressuscitou).toBe(true);
    expect(r1.hp).toBe(50);
    const r2 = tentarRessurreicaoParcial(r1.estado, 0, 200);
    expect(r2.ressuscitou).toBe(false);
    // Já usada: não pode ser preparada de novo nesta luta
    const denovo = aplicarCuras({ ...base, ressurreicaoAtual: r1.estado, aplicacoes: [{ efeito: 'ressurreicaoParcial', percentualHpMax: 25 }] });
    expect(denovo.ressurreicaoParcial?.usada).toBe(true);
    expect(denovo.aplicados).toEqual([]);
  });
});

describe('1.2.4 — Cura e restauração no combate', () => {
  const curaDe = (id: string, nome: string, efeitosCura: AplicacaoCura[]): DefinicaoHabilidade => ({
    id,
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      nome,
      tipoDano: 'fisico',
      percentualDano: 100,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 0,
      bonusContraSobreescudoPercentual: 0,
      curaPercentualDanoCausado: 0,
      curaPercentualHpMax: 0,
      efeitosCura,
    }),
  });

  beforeEach(() => {
    limparRegistroParaTestes();
    registrarHabilidade(curaDe('teste_cura_excesso', 'Sopro Vital', [{ efeito: 'curaEmExcesso', percentualHpMax: 10, percentualSobreescudo: 50 }]));
    registrarHabilidade(curaDe('teste_cura_continua', 'Raízes', [{ efeito: 'curaContinua', percentualHpMax: 5, duracaoRodadas: 3 }]));
    registrarHabilidade(curaDe('teste_limpeza', 'Purificar', [{ efeito: 'limpeza', quantidadeEfeitos: 3, percentualHpMax: 0 }]));
    registrarHabilidade(curaDe('teste_ressurreicao', 'Última Chama', [{ efeito: 'ressurreicaoParcial', percentualHpMax: 30 }]));
  });
  afterEach(() => limparRegistroParaTestes());

  const barbaro = (habilidadeId: string, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Bárbaro Teste',
    classeId: 'barbaro',
    nivel: 1,
    hp: 100,
    hpMax: 200,
    sobreescudo: 0,
    habilidadesEquipadas: {
      ataqueBasico: habilidadeId,
      habilidadeEspecial: 'barbaro_furia_selvagem',
      ultimate: 'barbaro_ira_do_barbaro',
    },
    atributos: { vigor: 40, sorte: 0, forca: 10, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });

  const alvo = (): Combatente => ({
    nome: 'Alvo',
    hp: 500,
    hpMax: 500,
    sobreescudo: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
  });

  it('a habilidade ataca e depois cura quem a usou (Cura em Excesso)', () => {
    const b = barbaro('teste_cura_excesso');
    const atk = turnoDeCombate(b, alvo(), 1).turnoLog.ataques[0];
    expect(atk.danoEfetivo).toBe(10);
    expect(atk.curaHabilidade).toBe(20);
    expect(b.hp).toBe(120);
    const escudoMax = calcularSobreescudoMax(10, { classeId: 'barbaro', nivel: 1 });
    expect(b.sobreescudo).toBe(Math.ceil(escudoMax / 2));
    expect(atk.efeitosCuraAplicados).toEqual(['curaEmExcesso']);
    expect(atk.mensagem).toContain('recupera 20 HP');
  });

  it('Ressurreição Parcial: o defensor que cai a 0 volta com 30% do HP', () => {
    const def = barbaro('teste_ressurreicao', {
      hp: 5,
      ressurreicaoParcial: { percentualHpMax: 30, usada: false },
    });
    const atacante: Combatente = { ...alvo(), atributos: { ...alvo().atributos, forca: 50 } };
    const atk = turnoDeCombate(atacante, def, 1).turnoLog.ataques[0];
    expect(atk.ressurreicaoDefensor).toBe(true);
    expect(def.hp).toBe(60);
    expect(def.ressurreicaoParcial?.usada).toBe(true);
    // Segunda queda: não volta mais
    turnoDeCombate(atacante, def, 2);
    turnoDeCombate(atacante, def, 3);
    expect(def.hp).toBe(0);
  });

  it('no combate completo: Cura Contínua aparece no fim da rodada', () => {
    const r = resolverCombate(barbaro('teste_cura_continua'), MONSTERS_MAP['cultista-das-sombras'], 99);
    const eventos = r.logTurnos.flatMap((t) => t.eventosCura ?? []);
    expect(eventos.some((e) => e.tipo === 'curaContinua' && e.combatente === 'Bárbaro Teste')).toBe(true);
  });

  it('no combate completo: Limpeza remove o Veneno do Rato da Peste', () => {
    const r = resolverCombate(barbaro('teste_limpeza'), MONSTERS_MAP['rato-da-peste'], 7, {
      rngStatus: () => 0, // o rato sempre envenena
    });
    const eventos = r.logTurnos.flatMap((t) => t.eventosEfeitos);
    expect(eventos.some((e) => e.tipo === 'aplicado' && e.efeito === 'veneno')).toBe(true);
    expect(eventos.some((e) => e.tipo === 'removido' && e.efeito === 'veneno')).toBe(true);
  });

  it('no combate completo: depois de usar a habilidade, o personagem volta da primeira queda', () => {
    // Agilidade 6 contra 5: o personagem age primeiro e prepara a Ressurreição antes de cair
    const fragil = barbaro('teste_ressurreicao', {
      hp: 20,
      hpMax: 20,
      atributos: { vigor: 4, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 6 },
    });
    const r = resolverCombate(fragil, MONSTERS_MAP['cavaleiro-do-vazio'], 5);
    const ressurgiu = r.logTurnos.some(
      (t) => t.ataques.some((a) => a.ressurreicaoDefensor) || (t.eventosCura ?? []).some((e) => e.tipo === 'ressurreicao')
    );
    expect(ressurgiu).toBe(true);
  });
});
