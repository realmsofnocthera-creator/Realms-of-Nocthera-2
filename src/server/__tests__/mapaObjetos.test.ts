import { describe, it, expect, beforeEach } from 'vitest';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, salvarRascunho } from '@/server/conteudo';
import type { SessaoMestre } from '@/server/mestre';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { monstroDadosDeDefinicao } from '@/rules/monstroConteudo';
import { MONSTROS_CACADA } from '@/rules/cacada';
import { referenciasDoConteudo } from '@/rules/conteudo';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre');

const comObjetos = (objetos: ObjetoDoMapa[]): MapaDados => ({ ...mapaVazio(10, 8), objetos });
const porta = (mapa: string): ObjetoDoMapa => ({ ...objetoNovo('porta', 'porta-1', 1, 1), destino: { mapa, x: 2, y: 2 } });
const cacada = (monstroId: string): ObjetoDoMapa => ({ ...objetoNovo('cacada', 'cacada-1', 3, 3), monstroId });

describe('Mapa com objetos: referências no servidor (3.5.6.3)', () => {
  beforeEach(() => {
    resetCharacterStore();
    limparCacheDoConteudo();
  });

  it('lista as referências: tilesets (publicados), mapas das portas (só existir) e monstros', () => {
    const mapa = { ...comObjetos([porta('vila'), { ...porta('vila'), id: 'porta-2', x: 2 }, cacada('lobo-cinzento')]), tilesets: ['grama'] };
    expect(referenciasDoConteudo('mapa', mapa)).toEqual([
      { tipo: 'tileset', id: 'grama' },
      { tipo: 'mapa', id: 'vila', soExistir: true },
      { tipo: 'monstro', id: 'lobo-cinzento', podeSerDoCodigo: true },
    ]);
  });

  it('porta para mapa que não existe: recusa; depois de criar o destino, aceita', async () => {
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: comObjetos([porta('floresta')]) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Mapa "floresta" não existe/) });
    await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: mapaVazio(10, 8) });
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: comObjetos([porta('floresta')]) })).resolves.toMatchObject({ chave: 'mapa__vila' });
  });

  it('dois mapas que se ligam conseguem ser publicados (o destino só precisa existir)', async () => {
    await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapaVazio(10, 8) });
    await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: mapaVazio(10, 8) });
    await salvarRascunho(mestre, 'mapa', 'vila', { revisao: 1, dados: comObjetos([porta('floresta')]) });
    await salvarRascunho(mestre, 'mapa', 'floresta', { revisao: 1, dados: comObjetos([porta('vila')]) });
    await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 2, motivo: 'primeiro mapa' })).resolves.toBeDefined();
    await expect(publicarConteudo(mestre, 'mapa', 'floresta', { revisao: 2, motivo: 'segundo mapa' })).resolves.toBeDefined();
  });

  it('porta para o próprio mapa é aceita', async () => {
    await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapaVazio(10, 8) });
    await expect(salvarRascunho(mestre, 'mapa', 'vila', { revisao: 1, dados: comObjetos([porta('vila')]) })).resolves.toBeDefined();
  });

  it('área de monstros: monstro do código vale; inexistente é recusado; monstro só do banco exige estar publicado', async () => {
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'mapa-a', nome: 'Mapa A', dados: comObjetos([cacada('lobo-cinzento')]) })).resolves.toBeDefined();
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'mapa-b', nome: 'Mapa B', dados: comObjetos([cacada('coelho-raivoso')]) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Monstro "coelho-raivoso" não existe/) });
    const lobo = MONSTROS_CACADA[0];
    await criarConteudo(mestre, { tipo: 'monstro', id: 'coelho-raivoso', nome: 'Coelho Raivoso', dados: { ...monstroDadosDeDefinicao(lobo), nome: 'Coelho Raivoso' } });
    await criarConteudo(mestre, { tipo: 'mapa', id: 'mapa-b', nome: 'Mapa B', dados: comObjetos([cacada('coelho-raivoso')]) });
    await expect(publicarConteudo(mestre, 'mapa', 'mapa-b', { revisao: 1, motivo: 'monstro ainda em rascunho' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Publique antes o monstro/) });
    await publicarConteudo(mestre, 'monstro', 'coelho-raivoso', { revisao: 1, motivo: 'monstro pronto' });
    await expect(publicarConteudo(mestre, 'mapa', 'mapa-b', { revisao: 1, motivo: 'agora sim' })).resolves.toBeDefined();
  });

  it('objeto inválido no mapa é recusado pelo servidor com a lista de problemas', async () => {
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'mapa-a', nome: 'Mapa A', dados: comObjetos([objetoNovo('inicio', 'i1', 0, 0), objetoNovo('inicio', 'i2', 1, 0)]) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/um início/) });
  });
});
