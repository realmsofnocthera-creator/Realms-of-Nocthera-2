import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate, RETALIACAO_DO_JURAMENTO_PERCENTUAL } from '@/game/combat';
import { DADOS_CACADA_MAP, DANO_DO_ELEMENTO_INTENSIFICADO, MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';

const ALVO: MonsterDefinition = {
  ...MONSTERS_MAP['rato-da-peste'],
  id: 'alvo-de-teste',
  nome: 'Alvo de Teste',
  hp: 50000,
  efeitosAplicados: undefined,
  modificadoresElementais: undefined,
  habilidades: undefined,
  atributos: { vigor: 1, sorte: 0, forca: 200, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
};

const heroi = (extra: Partial<Combatente> = {}): Combatente => ({
  nome: 'Herói',
  racaId: 'humano',
  classeId: 'barbaro',
  nivel: 10,
  hp: 50000,
  hpMax: 50000,
  sobreescudo: 0,
  mitigacao: 10,
  atributos: { vigor: 20, sorte: 0, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
  ...extra,
});

const ataquesDo = (r: ReturnType<typeof resolverCombate>, quem: string) => r.logTurnos.flatMap((t) => t.ataques.filter((a) => a.atacante === quem));

describe('Subespécies no motor (1.11.3)', () => {
  it('os dados: dois elementos, intensificado e o Urso Colérico com 60%', () => {
    expect(DADOS_CACADA_MAP['cryovarn-abissal']).toMatchObject({ elementoAtaque: 'gelo', elementoAlternado: 'sombrio' });
    expect(DADOS_CACADA_MAP['rathmorn-abissal']).toMatchObject({ elementoAtaque: 'fogo', elementoAlternado: 'sombrio' });
    for (const id of ['abysskar-abissal', 'zaryth-abissal', 'raizark-abissal'].filter((i) => DADOS_CACADA_MAP[i]))
      expect(MONSTROS_CACADA_MAP[id].danoElementalPercentual, id).toBe(DANO_DO_ELEMENTO_INTENSIFICADO);
    expect(Object.values(DADOS_CACADA_MAP).filter((d) => d.danoElementalPercentual)).toHaveLength(3);
    expect(MONSTROS_CACADA_MAP['urso-colerico']).toMatchObject({ enfurecido: true, enfurecidoLimiarPercentual: 60 });
  });

  it('dois elementos: os golpes alternam por rodada, o primeiro na 1ª rodada', () => {
    const m: MonsterDefinition = { ...ALVO, elementoAtaque: 'gelo', elementoAlternado: 'sombrio' };
    const r = resolverCombate(heroi(), m, 7, { rngStatus: () => 99.9 });
    const elementos = r.logTurnos.slice(0, 4).map((t) => t.ataques.find((a) => a.atacante === 'Alvo de Teste')?.elemento);
    expect(elementos).toEqual(['gelo', 'sombrio', 'gelo', 'sombrio']);
  });

  it('intensificado: +50% no dano dos golpes elementais', () => {
    const base: MonsterDefinition = { ...ALVO, elementoAtaque: 'relampago' };
    const golpe = (m: MonsterDefinition) => ataquesDo(resolverCombate(heroi(), m, 7, { rngStatus: () => 99.9, rngCritico: () => 99.9 }), 'Alvo de Teste')[0].danoBruto;
    const normal = golpe(base);
    const forte = golpe({ ...base, danoElementalPercentual: 50 });
    expect(forte).toBe(Math.floor((normal * 150) / 100));
  });

  it('Enfurecido com limiar próprio: o Urso Colérico enfurece com 60% de vida', () => {
    // a vida do monstro antes de cada golpe dele é a que sobrou do golpe anterior do herói
    const golpesDoMonstro = (limiar?: number) => {
      const m: MonsterDefinition = { ...ALVO, hp: 2000, enfurecido: true, ...(limiar ? { enfurecidoLimiarPercentual: limiar } : {}) };
      const r = resolverCombate(heroi({ atributos: { ...heroi().atributos, forca: 25 } }), m, 7, { rngStatus: () => 99.9 });
      const saida: { vida: number; enfurecido: boolean }[] = [];
      let vida = m.hp;
      for (const a of r.logTurnos.flatMap((t) => t.ataques)) {
        if (a.atacante === 'Herói') vida = a.hpRestante;
        else saida.push({ vida, enfurecido: a.enfurecidoAtivo === true });
      }
      return saida;
    };
    const com60 = golpesDoMonstro(60);
    const padrao = golpesDoMonstro();
    for (const g of com60) expect(g.enfurecido).toBe(g.vida < 1200);
    for (const g of padrao) expect(g.enfurecido).toBe(g.vida < 1000);
    // houve golpe entre 50% e 60% de vida: enfurecido só com o limiar de 60%
    expect(com60.some((g) => g.vida >= 1000 && g.vida < 1200 && g.enfurecido)).toBe(true);
  });
});

describe('Elemento do Feiticeiro no motor (1.5.2)', () => {
  const feiticeiro = (extra: Partial<Combatente> = {}) =>
    heroi({ classeId: 'feiticeiro', atributos: { vigor: 20, sorte: 0, forca: 0, vitalidade: 20, arcano: 10, inteligencia: 60, agilidade: 10 }, ...extra });

  it('as habilidades da classe usam o elemento escolhido', () => {
    const r = resolverCombate(feiticeiro({ elementoDaClasse: 'gelo' }), ALVO, 7, { rngStatus: () => 99.9 });
    const golpes = ataquesDo(r, 'Herói');
    expect(golpes.length).toBeGreaterThan(0);
    expect(golpes.every((a) => a.elemento === 'gelo')).toBe(true);
  });

  it('sem escolha, continuam sem elemento', () => {
    const r = resolverCombate(feiticeiro(), ALVO, 7, { rngStatus: () => 99.9 });
    expect(ataquesDo(r, 'Herói').every((a) => a.elemento === undefined)).toBe(true);
  });
});

describe('Retaliação do Juramento do Guardião (1.10.4)', () => {
  it('com o Juramento valendo, 30% do dano recebido volta ao atacante', () => {
    const cavaleiro = heroi({ classeId: 'cavaleiro', nivel: 30, juramentoGuardiaoAtivo: true });
    const r = resolverCombate(cavaleiro, ALVO, 7, { rngStatus: () => 99.9 });
    const golpe = ataquesDo(r, 'Alvo de Teste')[0];
    expect(golpe.juramentoDefensivoAplicado).toBe(true);
    expect(golpe.danoRetaliado).toBe(Math.floor((golpe.danoEfetivo * RETALIACAO_DO_JURAMENTO_PERCENTUAL) / 100));
    expect(golpe.mensagem).toMatch(/Retaliação/);
    // sem o Juramento, nada volta
    const sem = ataquesDo(resolverCombate(heroi({ classeId: 'cavaleiro', nivel: 30 }), ALVO, 7, { rngStatus: () => 99.9 }), 'Alvo de Teste')[0];
    expect(sem.danoRetaliado).toBeUndefined();
  });
});
