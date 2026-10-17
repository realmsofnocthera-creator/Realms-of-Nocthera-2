import { describe, it, expect } from 'vitest';
import { desfazer, historicoVazio, refazer, registrar, copiarMapa } from '@/lib/editorMapa';
import { atualizarObjeto, colocarObjeto, errosDosObjetos, moverObjeto, objetoNoPonto, removerObjeto } from '@/lib/objetosEditor';
import { mapaVazio } from '@/rules/mapa';

const novo = () => copiarMapa(mapaVazio(10, 8));

describe('Edição dos objetos do mapa', () => {
  it('coloca, acha por ponto, move e remove, com o lote para o histórico', () => {
    const mapa = novo();
    const c = colocarObjeto(mapa, 'npc', { x: 3, y: 2 });
    expect(c.ok && c.objeto?.id).toBe('npc-1');
    expect(mapa.objetos).toHaveLength(1);
    expect(objetoNoPonto(mapa, { x: 3, y: 2 })?.id).toBe('npc-1');
    expect(objetoNoPonto(mapa, { x: 4, y: 2 })).toBeUndefined();
    const m = moverObjeto(mapa, 'npc-1', { x: 5, y: 5 });
    expect(m.ok).toBe(true);
    expect(mapa.objetos[0]).toMatchObject({ x: 5, y: 5 });
    const r = removerObjeto(mapa, 'npc-1');
    expect(r.ok).toBe(true);
    expect(mapa.objetos).toEqual([]);
  });

  it('recusa tile ocupado, fora do mapa, segundo início e movimento para o mesmo lugar', () => {
    const mapa = novo();
    colocarObjeto(mapa, 'npc', { x: 1, y: 1 });
    expect(colocarObjeto(mapa, 'bau', { x: 1, y: 1 })).toMatchObject({ ok: false, erro: expect.stringMatching(/já tem npc/) });
    expect(colocarObjeto(mapa, 'bau', { x: 10, y: 1 })).toMatchObject({ ok: false });
    colocarObjeto(mapa, 'inicio', { x: 0, y: 0 });
    expect(colocarObjeto(mapa, 'inicio', { x: 2, y: 2 })).toMatchObject({ ok: false, erro: expect.stringMatching(/Já existe um início/) });
    expect(moverObjeto(mapa, 'npc-1', { x: 1, y: 1 })).toMatchObject({ ok: false });
    expect(moverObjeto(mapa, 'npc-1', { x: 0, y: 0 })).toMatchObject({ ok: false, erro: expect.stringMatching(/já tem/) });
    expect(removerObjeto(mapa, 'nada')).toMatchObject({ ok: false });
  });

  it('a área de monstros fica dentro do mapa ao colocar perto da borda e ao mover', () => {
    const mapa = novo();
    const c = colocarObjeto(mapa, 'cacada', { x: 9, y: 7 });
    expect(c.ok && c.objeto).toMatchObject({ largura: 1, altura: 1 });
    expect(errosDosObjetos(mapa)).toEqual([]);
    atualizarObjeto(mapa, 'cacada-1', (o) => void ((o.largura = 3), (o.altura = 3)));
    expect(errosDosObjetos(mapa).join(' ')).toMatch(/passa da borda/);
    expect(moverObjeto(mapa, 'cacada-1', { x: 8, y: 6 })).toMatchObject({ ok: false, erro: expect.stringMatching(/borda/) });
  });

  it('a área de monstros não bloqueia o tile de outro objeto, e o objeto de um tile aparece primeiro', () => {
    const mapa = novo();
    colocarObjeto(mapa, 'cacada', { x: 2, y: 2 });
    expect(colocarObjeto(mapa, 'npc', { x: 3, y: 3 }).ok).toBe(true);
    expect(objetoNoPonto(mapa, { x: 3, y: 3 })?.tipo).toBe('npc');
    expect(objetoNoPonto(mapa, { x: 2, y: 2 })?.tipo).toBe('cacada');
  });

  it('desfazer e refazer valem para objetos', () => {
    const mapa = novo();
    let h = historicoVazio();
    const c = colocarObjeto(mapa, 'placa', { x: 1, y: 1 });
    if (c.ok) h = registrar(h, c.lote);
    const m = moverObjeto(mapa, 'placa-1', { x: 4, y: 4 });
    if (m.ok) h = registrar(h, m.lote);
    h = desfazer(mapa, h);
    expect(mapa.objetos[0]).toMatchObject({ x: 1, y: 1 });
    h = desfazer(mapa, h);
    expect(mapa.objetos).toEqual([]);
    h = refazer(mapa, h);
    h = refazer(mapa, h);
    expect(mapa.objetos[0]).toMatchObject({ x: 4, y: 4 });
  });

  it('digitar um texto (mesmo campo) vira um só passo do desfazer; campos diferentes não se juntam', () => {
    const mapa = novo();
    let h = historicoVazio();
    const c = colocarObjeto(mapa, 'placa', { x: 1, y: 1 });
    if (c.ok) h = registrar(h, c.lote);
    for (const t of ['O', 'Ol', 'Olá']) {
      const r = atualizarObjeto(mapa, 'placa-1', (o) => void (o.texto = t));
      if (r.ok) h = registrar(h, { ...r.lote, grupo: 'placa-1:texto' });
    }
    expect(h.desfazer).toHaveLength(2);
    expect(mapa.objetos[0].texto).toBe('Olá');
    h = desfazer(mapa, h);
    expect(mapa.objetos[0].texto).toBe('');
    const mapa2 = novo();
    let h2 = historicoVazio();
    colocarObjeto(mapa2, 'npc', { x: 1, y: 1 });
    for (const [campo, fn] of [['nome', (o: { nome?: string }) => void (o.nome = 'Ana')], ['texto', (o: { texto?: string }) => void (o.texto = 'Oi')]] as const) {
      const r = atualizarObjeto(mapa2, 'npc-1', fn as never);
      if (r.ok) h2 = registrar(h2, { ...r.lote, grupo: `npc-1:${campo}` });
    }
    expect(h2.desfazer).toHaveLength(2);
  });

  it('registrar ignora lote de objetos que não mudou nada', () => {
    const mapa = novo();
    const r = atualizarObjeto(mapa, 'x', () => undefined);
    expect(r.ok).toBe(false);
    const c = colocarObjeto(mapa, 'placa', { x: 0, y: 0 });
    const igual = atualizarObjeto(mapa, 'placa-1', () => undefined);
    expect(c.ok && igual.ok).toBe(true);
    if (igual.ok) expect(registrar(historicoVazio(), igual.lote).desfazer).toHaveLength(0);
  });

  it('porta com destino em branco aparece como erro até escolher o mapa', () => {
    const mapa = novo();
    colocarObjeto(mapa, 'porta', { x: 1, y: 1 });
    expect(errosDosObjetos(mapa).join(' ')).toMatch(/mapa de destino/);
    atualizarObjeto(mapa, 'porta-1', (o) => void (o.destino = { mapa: 'vila-inicial', x: 2, y: 2 }));
    expect(errosDosObjetos(mapa)).toEqual([]);
  });
});
