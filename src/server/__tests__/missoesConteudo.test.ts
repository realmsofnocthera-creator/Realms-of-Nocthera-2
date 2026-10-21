import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { limparCacheRevogacao } from '@/server/auth';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, salvarRascunho } from '@/server/conteudo';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { cenaEmBranco } from '@/rules/cena';
import { mapaVazio } from '@/rules/mapa';
import { missaoEmBranco, type MissaoDados } from '@/rules/missao';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { repositorio } from '@/server/persistencia';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre', 'mes1');
const suporte = sessao('suporte', 'sup1');

const mapa = (objetos: ObjetoDoMapa[]) => {
  const m = mapaVazio(10, 8);
  m.objetos = objetos;
  return m;
};

describe('Missões como conteúdo versionado', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoConteudo();
    await repositorio.gravarPapelMestre({ uid: 'mes1', papel: 'mestre', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
    await repositorio.gravarPapelMestre({ uid: 'sup1', papel: 'suporte', concedidoPor: 'dono1', concedidoEm: new Date().toISOString(), motivo: 'teste' });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('cria, salva e publica uma missão; quem só consulta não cria', async () => {
    await criarConteudo(mestre, { tipo: 'missao', id: 'primeira', nome: 'Primeira', dados: missaoEmBranco('Primeira') });
    await publicarConteudo(mestre, 'missao', 'primeira', { revisao: 1, motivo: 'publicada no teste' });
    await expect(criarConteudo(suporte, { tipo: 'missao', id: 'outra', nome: 'Outra', dados: missaoEmBranco('Outra') })).rejects.toMatchObject({ status: 403 });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'ruim', nome: 'Ruim', dados: { ...missaoEmBranco('Ruim'), objetivos: [] } })).rejects.toMatchObject({ status: 400 });
  });

  it('a missão só salva com as referências existindo (cena, mapa, monstro, requisito); monstro do código vale', async () => {
    const base = (parte: Partial<MissaoDados>): MissaoDados => ({ ...missaoEmBranco('Teste'), ...parte });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'm1', nome: 'M1', dados: base({ objetivos: [{ id: 'a', tipo: 'cena', cenaId: 'nao-existe' }] }) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Cena "nao-existe" não existe/) });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'm2', nome: 'M2', dados: base({ objetivos: [{ id: 'a', tipo: 'chegar', mapa: 'nao-existe' }] }) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Mapa "nao-existe" não existe/) });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'm3', nome: 'M3', dados: base({ objetivos: [{ id: 'a', tipo: 'derrotar', monstroId: 'monstro-que-nao-existe', quantidade: 1 }] }) })).rejects.toMatchObject({ status: 400 });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'm4', nome: 'M4', dados: base({ requisitos: { missoes: ['nao-existe'], nivelMinimo: 0 } }) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Missão "nao-existe" não existe/) });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'm5', nome: 'M5', dados: missaoEmBranco('M5') })).resolves.toMatchObject({ id: 'm5' }); // rato-da-floresta é do código
    await criarConteudo(mestre, { tipo: 'cena', id: 'chegada', nome: 'Chegada', dados: cenaEmBranco('Chegada') });
    await expect(criarConteudo(mestre, { tipo: 'missao', id: 'm6', nome: 'M6', dados: base({ objetivos: [{ id: 'a', tipo: 'cena', cenaId: 'chegada' }], requisitos: { missoes: ['m5'], nivelMinimo: 0 } }) })).resolves.toMatchObject({ id: 'm6' });
  });

  it('duas missões podem se citar (basta existir) e o mapa cita missões e cenas da condição', async () => {
    await criarConteudo(mestre, { tipo: 'cena', id: 'chegada', nome: 'Chegada', dados: cenaEmBranco('Chegada') });
    await publicarConteudo(mestre, 'cena', 'chegada', { revisao: 1, motivo: 'publicada no teste' });
    limparCacheDoConteudo();
    await criarConteudo(mestre, { tipo: 'missao', id: 'missao-a', nome: 'Missão A', dados: missaoEmBranco('Missão A') });
    await criarConteudo(mestre, { tipo: 'missao', id: 'missao-b', nome: 'Missão B', dados: { ...missaoEmBranco('Missão B'), requisitos: { missoes: ['missao-a'], nivelMinimo: 0 } } });
    await salvarRascunho(mestre, 'missao', 'missao-a', { revisao: 1, dados: { ...missaoEmBranco('Missão A'), requisitos: { missoes: ['missao-b'], nivelMinimo: 0 } } }); // ciclo permitido ao salvar
    const objetos = [
      objetoNovo('inicio', 'inicio-1', 1, 1),
      { ...objetoNovo('npc', 'npc-1', 2, 2), missaoId: 'missao-a' },
      { ...objetoNovo('cena', 'cena-1', 4, 4), cenaId: 'chegada', condicao: { missaoConcluida: 'missao-b', cenaVista: 'chegada' } },
    ];
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: mapa(objetos) })).resolves.toMatchObject({ id: 'vila' });
    await expect(criarConteudo(mestre, { tipo: 'mapa', id: 'aldeia', nome: 'Aldeia', dados: mapa([{ ...objetoNovo('npc', 'npc-1', 2, 2), missaoId: 'nao-existe' }]) })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Missão "nao-existe" não existe/) });
    await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'publicado no teste' })).resolves.toBeDefined();
  });
});
