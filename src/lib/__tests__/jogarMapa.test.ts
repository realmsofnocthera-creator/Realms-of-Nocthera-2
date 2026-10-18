import { describe, it, expect } from 'vitest';
import { andar, iniciarJogo, interagir, tileLivre, type EstadoDeJogo } from '@/lib/jogarMapa';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';

const mapaCom = (objetos: ObjetoDoMapa[], colisao: [number, number][] = []): MapaDados => {
  const m = mapaVazio(10, 8);
  m.objetos = objetos;
  for (const [x, y] of colisao) m.camadas.colisao[y * 10 + x] = 1;
  return m;
};
const comecar = (objetos: ObjetoDoMapa[], colisao: [number, number][] = []) => iniciarJogo('vila', mapaCom([objetoNovo('inicio', 'inicio-1', 2, 2), ...objetos], colisao));
const ir = (e: EstadoDeJogo, ...dirs: Parameters<typeof andar>[1][]) => dirs.reduce((s, d) => andar(s, d).estado, e);

describe('Jogar o mapa (3.5.6.6)', () => {
  it('começa no início do jogador; sem início, no primeiro tile livre, avisando', () => {
    const e = comecar([]);
    expect(e).toMatchObject({ x: 2, y: 2, semInicio: false, olhando: 'baixo' });
    const sem = iniciarJogo('vila', mapaCom([], [[0, 0], [1, 0]]));
    expect(sem).toMatchObject({ x: 2, y: 0, semInicio: true });
  });

  it('anda tile a tile e sempre vira o jogador; para na borda e na colisão', () => {
    let e = comecar([], [[3, 2]]);
    const bloqueado = andar(e, 'direita');
    expect(bloqueado.estado).toMatchObject({ x: 2, y: 2, olhando: 'direita' });
    e = ir(e, 'cima', 'cima', 'cima');
    expect(e).toMatchObject({ x: 2, y: 0, olhando: 'cima' });
    e = ir(e, 'esquerda', 'esquerda', 'esquerda');
    expect(e.x).toBe(0);
    expect(andar(comecar([]), 'baixo').estado).toMatchObject({ x: 2, y: 3 });
  });

  it('NPC, placa e baú bloqueiam o passo; porta e início não', () => {
    const e = comecar([objetoNovo('npc', 'npc-1', 3, 2), objetoNovo('placa', 'placa-1', 2, 3), objetoNovo('bau', 'bau-1', 1, 2), { ...objetoNovo('porta', 'porta-1', 2, 1), destino: { mapa: 'x', x: 0, y: 0 }, gatilho: 'interagir' }]);
    expect(andar(e, 'direita').estado.x).toBe(2);
    expect(andar(e, 'baixo').estado.y).toBe(2);
    expect(andar(e, 'esquerda').estado.x).toBe(2);
    expect(andar(e, 'cima').estado.y).toBe(1); // porta "interagir" se pisa sem efeito
    expect(andar(e, 'cima').eventos).toEqual([]);
    expect(tileLivre(e.mapa, 2, 2)).toBe(true); // o início
    expect(tileLivre(e.mapa, -1, 0)).toBe(false);
    expect(tileLivre(e.mapa, 10, 0)).toBe(false);
  });

  it('porta "pisar" leva ao destino ao entrar', () => {
    const e = comecar([{ ...objetoNovo('porta', 'porta-1', 3, 2), destino: { mapa: 'floresta', x: 4, y: 5 } }]);
    expect(andar(e, 'direita').eventos).toEqual([{ tipo: 'porta', objetoId: 'porta-1', destino: { mapa: 'floresta', x: 4, y: 5 } }]);
  });

  it('porta "interagir" abre olhando para ela ou parado em cima; "pisar" avisa que abre ao pisar', () => {
    const porta = { ...objetoNovo('porta', 'porta-1', 3, 2), destino: { mapa: 'floresta', x: 1, y: 1 }, gatilho: 'interagir' as const };
    const e = comecar([porta]);
    const olhando = ir(e, 'direita'); // não anda: a porta é pisável, então anda para cima dela
    expect(olhando.x).toBe(3);
    expect(interagir(olhando).eventos).toEqual([{ tipo: 'porta', objetoId: 'porta-1', destino: { mapa: 'floresta', x: 1, y: 1 } }]);
    const pisar = comecar([{ ...porta, gatilho: 'pisar' }]);
    const de = andar(pisar, 'direita').estado;
    expect(interagir(de).eventos[0]).toMatchObject({ tipo: 'nada', motivo: expect.stringMatching(/ao pisar/) });
  });

  it('NPC e placa mostram o texto; sem texto, avisam que ainda não foi escrito', () => {
    const e = comecar([{ ...objetoNovo('npc', 'npc-1', 3, 2), nome: 'Aldric', texto: 'Cuidado.' }, { ...objetoNovo('placa', 'placa-1', 2, 3), texto: '' }]);
    const aoNpc = andar(e, 'direita').estado;
    expect(interagir(aoNpc).eventos).toEqual([{ tipo: 'texto', titulo: 'Aldric', texto: 'Cuidado.' }]);
    const aPlaca = andar(e, 'baixo').estado;
    expect(interagir(aPlaca).eventos[0]).toMatchObject({ tipo: 'texto', titulo: 'Placa', texto: expect.stringMatching(/ainda não tem texto/) });
  });

  it('baú dá o item uma vez; da segunda, está vazio', () => {
    const e = comecar([{ ...objetoNovo('bau', 'bau-1', 3, 2), item: { id: 'pelo-de-rato', qtd: 3 } }]);
    const virado = andar(e, 'direita').estado;
    const primeira = interagir(virado);
    expect(primeira.eventos).toEqual([{ tipo: 'item', objetoId: 'bau-1', item: { id: 'pelo-de-rato', qtd: 3 } }]);
    expect(primeira.estado.abertos).toEqual(['bau-1']);
    expect(interagir(primeira.estado).eventos).toEqual([{ tipo: 'bau-vazio' }]);
  });

  it('interagir sem nada à frente avisa', () => {
    expect(interagir(comecar([])).eventos[0]).toMatchObject({ tipo: 'nada' });
  });

  it('área de monstros dispara ao ENTRAR, não ao andar dentro dela, e dispara de novo ao sair e voltar', () => {
    const area = { ...objetoNovo('cacada', 'cacada-1', 3, 2), largura: 2, altura: 1, monstroId: 'lobo-cinzento' };
    let e = comecar([area]);
    const entrou = andar(e, 'direita');
    expect(entrou.eventos).toEqual([{ tipo: 'luta', objetoId: 'cacada-1', monstroId: 'lobo-cinzento' }]);
    e = entrou.estado;
    expect(andar(e, 'direita').eventos).toEqual([]); // ainda dentro
    e = ir(e, 'direita', 'direita'); // sai pela direita (5,2) e depois (6,2)
    e = ir(e, 'esquerda', 'esquerda'); // volta: entra em (4,2)
    expect(andar(ir(comecar([area]), 'direita', 'direita', 'direita'), 'esquerda').eventos).toHaveLength(1);
  });

  it('começar em posição de destino usa o ponto pedido (e ignora o que cai fora do mapa)', () => {
    const m = mapaCom([objetoNovo('inicio', 'inicio-1', 0, 0)]);
    expect(iniciarJogo('vila', m, { x: 5, y: 5 })).toMatchObject({ x: 5, y: 5 });
    expect(iniciarJogo('vila', m, { x: 50, y: 5 })).toMatchObject({ x: 0, y: 0 });
  });
});
