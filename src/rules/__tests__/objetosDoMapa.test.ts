import { describe, it, expect } from 'vitest';
import { mapaVazio, validarMapa } from '@/rules/mapa';
import { objetoCobre, objetoNovo, proximoIdDeObjeto, TIPOS_DE_OBJETO, validarObjetos, type ObjetoDoMapa } from '@/rules/objetosDoMapa';

const mapaCom = (objetos: unknown[]) => ({ ...mapaVazio(10, 8), objetos });
const erros = (objetos: unknown[], l = 10, a = 8) => {
  const e: string[] = [];
  validarObjetos(objetos, l, a, e);
  return e;
};

describe('Objetos interativos do mapa (3.5.6.3)', () => {
  it('mapa antigo, sem a lista de objetos, continua válido e vira "sem objetos"', () => {
    const { objetos: _ignorado, ...antigo } = mapaVazio(6, 6);
    const v = validarMapa(antigo);
    expect(v.ok && v.dados.objetos).toEqual([]);
  });

  it('aceita um objeto de cada tipo com valores iniciais e devolve a cópia limpa', () => {
    const lista = TIPOS_DE_OBJETO.map((t, i) => objetoNovo(t, `${t}-1`, i, 0));
    lista.forEach((o) => {
      if (o.tipo === 'porta') o.destino = { mapa: 'vila-inicial', x: 2, y: 3 };
    });
    expect(erros(lista)).toEqual([]);
    const v = validarMapa(mapaCom(lista));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.dados.objetos).toHaveLength(6);
      expect(v.dados.objetos).not.toBe(lista);
    }
  });

  it('cada tipo tem o gatilho certo e a ação fica por conta do tipo', () => {
    expect(objetoNovo('npc', 'a', 0, 0).gatilho).toBe('interagir');
    expect(objetoNovo('cacada', 'a', 0, 0).gatilho).toBe('entrar');
    expect(objetoNovo('porta', 'a', 0, 0).gatilho).toBe('pisar');
    expect(erros([{ ...objetoNovo('npc', 'a', 1, 1), gatilho: 'pisar' }])[0]).toMatch(/gatilho inválido/);
    expect(erros([{ ...objetoNovo('porta', 'p', 1, 1), destino: { mapa: 'vila', x: 1, y: 1 }, gatilho: 'interagir' }])).toEqual([]);
  });

  it('recusa campos que o tipo não tem, id repetido ou inválido, tipo e posição inválidos', () => {
    expect(erros([{ ...objetoNovo('placa', 'a', 1, 1), nome: 'x' }])[0]).toMatch(/campos que este tipo não tem: nome/);
    expect(erros([objetoNovo('placa', 'a', 1, 1), objetoNovo('placa', 'a', 2, 2)]).join(' ')).toMatch(/repetido/);
    expect(erros([{ ...objetoNovo('placa', 'A B', 1, 1) }])[0]).toMatch(/identificador/);
    expect(erros([{ id: 'x', tipo: 'dragao', x: 0, y: 0, gatilho: 'pisar' }])[0]).toMatch(/tipo inválido/);
    expect(erros([objetoNovo('placa', 'a', 10, 0)])[0]).toMatch(/dentro do mapa/);
    expect(erros([objetoNovo('placa', 'a', 0, -1)])[0]).toMatch(/dentro do mapa/);
    expect(erros(['texto' as unknown])[0]).toMatch(/precisa ser um objeto/);
  });

  it('um objeto por tile (a área de monstros pode cobrir outros) e no máximo um início', () => {
    expect(erros([objetoNovo('npc', 'a', 2, 2), objetoNovo('bau', 'b', 2, 2)]).join(' ')).toMatch(/já tem/);
    expect(erros([objetoNovo('npc', 'a', 2, 2), { ...objetoNovo('cacada', 'c', 1, 1), largura: 3, altura: 3 }])).toEqual([]);
    expect(erros([objetoNovo('inicio', 'i1', 0, 0), objetoNovo('inicio', 'i2', 1, 0)]).join(' ')).toMatch(/Só pode haver um início/);
  });

  it('valida os dados de cada tipo: item do baú, destino da porta, área e monstro', () => {
    expect(erros([{ ...objetoNovo('bau', 'b', 1, 1), item: { id: 'inventado', qtd: 1 } }])[0]).toMatch(/item desconhecido/);
    expect(erros([{ ...objetoNovo('bau', 'b', 1, 1), item: { id: 'pelo-de-rato', qtd: 0 } }])[0]).toMatch(/quantidade/);
    expect(erros([{ ...objetoNovo('porta', 'p', 1, 1), destino: { mapa: 'Vila Ruim', x: 1, y: 1 } }])[0]).toMatch(/mapa de destino/);
    expect(erros([objetoNovo('porta', 'p', 1, 1)])[0]).toMatch(/mapa de destino/); // destino em branco ainda não vale
    expect(erros([{ ...objetoNovo('cacada', 'c', 8, 6), largura: 5, altura: 5 }])[0]).toMatch(/passa da borda/);
    expect(erros([{ ...objetoNovo('cacada', 'c', 0, 0), largura: 0 }])[0]).toMatch(/área vai de 1/);
    expect(erros([{ ...objetoNovo('cacada', 'c', 0, 0), monstroId: 'Monstro Ruim' }])[0]).toMatch(/escolha o monstro/);
    expect(erros([{ ...objetoNovo('npc', 'n', 0, 0), nome: '' }])[0]).toMatch(/nome vai de 1/);
    expect(erros([{ ...objetoNovo('placa', 'p', 0, 0), texto: 'a'.repeat(601) }])[0]).toMatch(/texto vai até/);
  });

  it('limite de 200 objetos', () => {
    const muitos = Array.from({ length: 201 }, (_, i) => objetoNovo('placa', `p-${i}`, i % 128, Math.floor(i / 128)));
    expect(erros(muitos, 128, 128).join(' ')).toMatch(/no máximo 200/);
  });

  it('ajudantes: próximo id livre e o que a área cobre', () => {
    const lista = [objetoNovo('npc', 'npc-1', 0, 0), objetoNovo('npc', 'npc-3', 1, 0)];
    expect(proximoIdDeObjeto(lista, 'npc')).toBe('npc-2');
    expect(proximoIdDeObjeto(lista, 'bau')).toBe('bau-1');
    const area: ObjetoDoMapa = { ...objetoNovo('cacada', 'c', 2, 2), largura: 2, altura: 3 };
    expect(objetoCobre(area, 3, 4)).toBe(true);
    expect(objetoCobre(area, 4, 4)).toBe(false);
    expect(objetoCobre(lista[0], 0, 0)).toBe(true);
    expect(objetoCobre(lista[0], 1, 0)).toBe(false);
  });
});
