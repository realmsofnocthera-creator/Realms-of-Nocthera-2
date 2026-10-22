import { describe, it, expect } from 'vitest';
import {
  bonusDaColecao,
  bonusDasCartas,
  conjuntosCompletos,
  desequiparCarta,
  despertarCarta,
  destruirCartas,
  equiparCarta,
  guardarCartas,
  refinarCarta,
} from '@/game/almas';
import {
  BONUS_DO_CONJUNTO_PERCENTUAL,
  CACOS_AO_DESTRUIR,
  CARTAS_MAXIMAS,
  CATEGORIAS_DE_CARTA,
  criarCarta,
  EFEITOS_ALEATORIOS_POR_RARIDADE,
  faixaDoAleatorio,
  lerCartasPersonagem,
  POOL_DE_EFEITOS,
  RARIDADES_DE_CARTA,
  sortearEfeito,
  textoDoEfeito,
  tiposDaRaridadeDeCarta,
  TIPO_DE_CARTA_MAP,
  TIPOS_DE_CARTA,
  valorFixoDaCarta,
  type CartaItem,
} from '@/rules/almas';

const seq = (...valores: number[]) => {
  let i = 0;
  return () => valores[i++ % valores.length];
};
const carta = (id: string, tipo: string, despertar = 0): CartaItem => {
  const c = criarCarta(id, tipo, seq(0.1, 0.5));
  return { ...c, despertar };
};

describe('catálogo da Alma', () => {
  it('54 cartas: 9 por raridade, 3 por categoria em cada raridade, ids únicos', () => {
    expect(TIPOS_DE_CARTA).toHaveLength(54);
    expect(new Set(TIPOS_DE_CARTA.map((t) => t.id)).size).toBe(54);
    for (const r of RARIDADES_DE_CARTA) {
      expect(tiposDaRaridadeDeCarta(r)).toHaveLength(9);
      for (const c of CATEGORIAS_DE_CARTA) expect(tiposDaRaridadeDeCarta(r).filter((t) => t.categoria === c)).toHaveLength(3);
    }
  });

  it('os 54 nomes são do Yuri: únicos e na ordem categoria, carta e raridade', () => {
    expect(new Set(TIPOS_DE_CARTA.map((t) => t.nome)).size).toBe(54);
    expect(TIPOS_DE_CARTA.some((t) => t.nome.includes('a confirmar'))).toBe(false);
    const nome = (id: string) => TIPO_DE_CARTA_MAP[id].nome;
    expect(nome('alma-comum-1')).toBe('Centelha Arcana');
    expect(nome('alma-mitico-1')).toBe('Origem da Magia');
    expect(nome('alma-lendario-2')).toBe('Vontade do Abismo');
    expect(nome('alma-epico-3')).toBe('Marca da Ruína');
    expect(nome('corpo-muitoRaro-2')).toBe('Escamas de Titã');
    expect(nome('corpo-mitico-3')).toBe('Força Primordial');
    expect(nome('mente-raro-1')).toBe('Instinto Predatório');
    expect(nome('mente-comum-2')).toBe('Mira Precisa');
    expect(nome('mente-mitico-3')).toBe('Consciência Absoluta');
  });

  it('efeitos aleatórios por raridade: 1, 1, 2, 2, 3, 3', () => {
    expect(RARIDADES_DE_CARTA.map((r) => EFEITOS_ALEATORIOS_POR_RARIDADE[r])).toEqual([1, 1, 2, 2, 3, 3]);
    for (const r of RARIDADES_DE_CARTA) {
      const tipo = tiposDaRaridadeDeCarta(r)[0].id;
      expect(criarCarta('x', tipo, seq(0.3, 0.7)).efeitos).toHaveLength(EFEITOS_ALEATORIOS_POR_RARIDADE[r]);
    }
  });

  it('o sorteio fica dentro do pool e da faixa da raridade', () => {
    for (let i = 0; i < 200; i++) {
      const r = RARIDADES_DE_CARTA[i % 6];
      const e = sortearEfeito(r, () => Math.random());
      expect(POOL_DE_EFEITOS).toContain(e.efeito);
      const [min, max] = faixaDoAleatorio(e.efeito, r);
      expect(e.valor).toBeGreaterThanOrEqual(min);
      expect(e.valor).toBeLessThanOrEqual(max);
    }
  });

  it('valor fixo por raridade e despertar (+25%, +50%, +100%)', () => {
    const mitica = tiposDaRaridadeDeCarta('mitico').find((t) => t.fixo === 'hp')!.id;
    expect(valorFixoDaCarta({ tipo: mitica, despertar: 0 })).toBe(14);
    expect(valorFixoDaCarta({ tipo: mitica, despertar: 1 })).toBe(17.5);
    expect(valorFixoDaCarta({ tipo: mitica, despertar: 2 })).toBe(21);
    expect(valorFixoDaCarta({ tipo: mitica, despertar: 3 })).toBe(28);
    const comum = tiposDaRaridadeDeCarta('comum').find((t) => t.fixo === 'atqFisico')!.id;
    expect(valorFixoDaCarta({ tipo: comum, despertar: 0 })).toBe(4);
    const critico = tiposDaRaridadeDeCarta('comum').find((t) => t.fixo === 'chanceCritico')!.id;
    expect(valorFixoDaCarta({ tipo: critico, despertar: 0 })).toBe(2);
  });

  it('texto dos efeitos', () => {
    expect(textoDoEfeito('atqFisico', 8)).toBe('+8% de ATQ físico');
    expect(textoDoEfeito('forca', 3)).toBe('+3 de Força');
    expect(textoDoEfeito('hp', 17.5)).toBe('+17,5% de HP');
  });

  it('lê do banco com tolerância e respeita os limites dos espaços', () => {
    const t = tiposDaRaridadeDeCarta('comum').filter((x) => x.categoria === 'alma');
    const a = carta('a', t[0].id);
    const b = carta('b', t[0].id);
    const c = carta('c', t[1].id);
    const r = lerCartasPersonagem([a, b, c, { id: 'z', tipo: 'nao-existe', efeitos: [] }, { ...a, id: 'w', efeitos: [{ efeito: 'forca', valor: 999 }] }, 7], ['a', 'b', 'c', 'inexistente'], ['alma-comum-1', 'lixo']);
    expect(r.itens.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(r.equipadas).toEqual(['a', 'c']); // b repete o tipo de a
    expect(r.descobertas).toEqual(expect.arrayContaining(['alma-comum-1', 'alma-comum-2']));
    expect(r.descobertas).not.toContain('lixo');
    expect(lerCartasPersonagem(undefined, undefined, undefined)).toEqual({ itens: [], equipadas: [], descobertas: [] });
  });
});

describe('operações da Alma', () => {
  const almas = tiposDaRaridadeDeCarta('comum').filter((t) => t.categoria === 'alma').map((t) => t.id);
  const corpos = tiposDaRaridadeDeCarta('comum').filter((t) => t.categoria === 'corpo').map((t) => t.id);

  it('equipa até 3 por categoria, sem repetir o tipo', () => {
    const itens = [carta('a1', almas[0]), carta('a2', almas[1]), carta('a3', almas[2]), carta('a4', tiposDaRaridadeDeCarta('raro').find((t) => t.categoria === 'alma')!.id), carta('a1b', almas[0]), carta('c1', corpos[0])];
    let eq: string[] = [];
    for (const id of ['a1', 'a2', 'a3']) {
      const r = equiparCarta(itens, eq, id);
      expect(r.ok).toBe(true);
      if (r.ok) eq = r.equipadas;
    }
    expect(equiparCarta(itens, eq, 'a4')).toEqual({ ok: false, motivo: 'categoriaCheia' });
    expect(equiparCarta(itens, eq, 'a1')).toEqual({ ok: false, motivo: 'jaEquipada' });
    const sem = desequiparCarta(eq, 'a3');
    expect(sem.ok && sem.equipadas).toEqual(['a1', 'a2']);
    expect(equiparCarta(itens, ['a1', 'a2'], 'a1b')).toEqual({ ok: false, motivo: 'tipoJaEquipado' });
    expect(equiparCarta(itens, eq, 'c1')).toMatchObject({ ok: true });
    expect(equiparCarta(itens, eq, 'nada')).toEqual({ ok: false, motivo: 'cartaNaoEncontrada' });
    expect(desequiparCarta(eq, 'c1')).toEqual({ ok: false, motivo: 'naoEquipada' });
  });

  it('despertar: só lendária e mítica, gasta cópias da mesma carta e poeira, até o III', () => {
    const lend = tiposDaRaridadeDeCarta('lendario')[0].id;
    const outra = tiposDaRaridadeDeCarta('lendario')[1].id;
    const itens = [carta('l', lend), carta('c1', lend), carta('c2', lend), carta('c3', lend), carta('c4', lend), carta('o', outra)];
    expect(despertarCarta([carta('x', almas[0])], [], 999, 'x')).toEqual({ ok: false, motivo: 'naoDesperta' });
    expect(despertarCarta(itens, [], 5, 'l')).toEqual({ ok: false, motivo: 'poeiraInsuficiente' });
    expect(despertarCarta(itens.slice(0, 2), [], 999, 'l')).toEqual({ ok: false, motivo: 'copiasInsuficientes' });
    expect(despertarCarta(itens, ['c1', 'c2', 'c3'], 999, 'l')).toEqual({ ok: false, motivo: 'copiasInsuficientes' });
    const r1 = despertarCarta(itens, [], 100, 'l');
    expect(r1.ok && r1.nivel).toBe(1);
    if (!r1.ok) return;
    expect(r1.poeira).toBe(80);
    expect(r1.itens.map((i) => i.id)).toEqual(['l', 'c3', 'c4', 'o']);
    expect(r1.itens[0].despertar).toBe(1);
    // II pede 3 cópias: só sobram 2
    expect(despertarCarta(r1.itens, [], 999, 'l')).toEqual({ ok: false, motivo: 'copiasInsuficientes' });
    const maximo = [carta('m', lend, 3), ...Array.from({ length: 4 }, (_, i) => carta(`k${i}`, lend))];
    expect(despertarCarta(maximo, [], 999, 'm')).toEqual({ ok: false, motivo: 'despertarMaximo' });
  });

  it('refinar: sorteia de novo só o efeito escolhido e gasta cacos', () => {
    const lend = tiposDaRaridadeDeCarta('lendario')[0].id;
    const c = carta('l', lend);
    expect(c.efeitos).toHaveLength(3);
    expect(refinarCarta([c], 10, 'l', 0, seq(0.9, 0.9))).toEqual({ ok: false, motivo: 'cacosInsuficientes' });
    expect(refinarCarta([c], 999, 'l', 3, seq(0.9, 0.9))).toEqual({ ok: false, motivo: 'efeitoInvalido' });
    expect(refinarCarta([c], 999, 'l', 'x', seq(0.9, 0.9))).toEqual({ ok: false, motivo: 'efeitoInvalido' });
    const r = refinarCarta([c], 100, 'l', 1, seq(0.99, 0.99));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cacos).toBe(20);
    expect(r.itens[0].efeitos[0]).toEqual(c.efeitos[0]);
    expect(r.itens[0].efeitos[2]).toEqual(c.efeitos[2]);
    expect(r.depois).toEqual(r.itens[0].efeitos[1]);
  });

  it('destruir: dá cacos pela raridade; carta equipada não', () => {
    const itens = [carta('a', almas[0]), carta('b', tiposDaRaridadeDeCarta('mitico')[0].id)];
    expect(destruirCartas(itens, ['a'], ['a'])).toEqual({ ok: false, motivo: 'equipadaNaoDestroi' });
    expect(destruirCartas(itens, [], [])).toEqual({ ok: false, motivo: 'nenhumaCarta' });
    expect(destruirCartas(itens, [], ['zz'])).toEqual({ ok: false, motivo: 'cartaNaoEncontrada' });
    const r = destruirCartas(itens, [], ['a', 'b', 'a']);
    expect(r.ok && r.cacos).toBe(CACOS_AO_DESTRUIR.comum + CACOS_AO_DESTRUIR.mitico);
    expect(r.ok && r.itens).toEqual([]);
  });

  it('inventário cheio: o excesso vira cacos', () => {
    const cheio = Array.from({ length: CARTAS_MAXIMAS - 1 }, (_, i) => carta(`i${i}`, almas[0]));
    const r = guardarCartas(cheio, [carta('n1', almas[1]), carta('n2', tiposDaRaridadeDeCarta('epico')[0].id)]);
    expect(r.itens).toHaveLength(CARTAS_MAXIMAS);
    expect(r.cacosDoExcesso).toBe(CACOS_AO_DESTRUIR.epico);
  });
});

describe('bônus da Alma e da coleção', () => {
  it('soma o fixo (com despertar) e os aleatórios das cartas equipadas; só do nível 25 em diante', () => {
    const hp = tiposDaRaridadeDeCarta('comum').find((t) => t.fixo === 'hp')!.id;
    const c = { id: 'h', tipo: hp, efeitos: [{ efeito: 'forca' as const, valor: 2 }], despertar: 0 };
    const b = bonusDasCartas([c], ['h'], [hp], 25);
    expect(b.hp).toBe(4);
    expect(b.atributos.forca).toBe(2);
    expect(bonusDasCartas([c], ['h'], [hp], 24).hp).toBe(0);
    expect(bonusDasCartas([c], [], [hp], 30).hp).toBe(0);
  });

  it('conjunto completo (9 cartas descobertas) dá +X% de ATQ, DEF e HP', () => {
    const comuns = tiposDaRaridadeDeCarta('comum').map((t) => t.id);
    expect(conjuntosCompletos(comuns.slice(1))).toEqual([]);
    expect(conjuntosCompletos(comuns)).toEqual(['comum']);
    const todas = TIPOS_DE_CARTA.map((t) => t.id);
    expect(bonusDaColecao(todas)).toBe(Object.values(BONUS_DO_CONJUNTO_PERCENTUAL).reduce((a, b) => a + b, 0));
    const b = bonusDasCartas([], [], comuns, 25);
    expect([b.atqFisico, b.atqMagico, b.defesa, b.hp]).toEqual([1, 1, 1, 1]);
  });

  it('o tipo de cada carta existe no catálogo', () => {
    for (const t of TIPOS_DE_CARTA) expect(TIPO_DE_CARTA_MAP[t.id]).toBe(t);
  });
});
