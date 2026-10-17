import { describe, it, expect, beforeEach } from 'vitest';
import { criarConteudo, limparCacheDoConteudo, publicarConteudo, salvarRascunho, verificarMapaDoPainel } from '@/server/conteudo';
import type { SessaoMestre } from '@/server/mestre';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const mestre = sessao('mestre');
const suporte = sessao('suporte');
const comObjetos = (objetos: ObjetoDoMapa[], colisao: [number, number][] = []): MapaDados => {
  const m = mapaVazio(10, 8);
  m.objetos = objetos;
  for (const [x, y] of colisao) m.camadas.colisao[y * 10 + x] = 1;
  return m;
};
const porta = (destino: string, x = 1, y = 1): ObjetoDoMapa => ({ ...objetoNovo('porta', 'porta-1', 5, 5), destino: { mapa: destino, x, y } });

describe('Verificação do mapa no servidor (3.5.6.6)', () => {
  beforeEach(() => {
    resetCharacterStore();
    limparCacheDoConteudo();
  });

  it('o painel lista erros e avisos, usando os outros mapas; suporte pode ler', async () => {
    await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: comObjetos([], [[1, 1]]) });
    await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: comObjetos([objetoNovo('inicio', 'inicio-1', 0, 0), porta('floresta', 1, 1)]) });
    const p = await verificarMapaDoPainel(suporte, 'mapa', 'vila');
    expect(p.map((x) => x.nivel)).toContain('erro');
    expect(p.find((x) => x.nivel === 'erro')?.texto).toMatch(/está bloqueado/);
  });

  it('publicar com erro é recusado com o motivo; corrigido o destino, publica; aviso não impede', async () => {
    await criarConteudo(mestre, { tipo: 'mapa', id: 'floresta', nome: 'Floresta', dados: comObjetos([], [[1, 1]]) });
    await criarConteudo(mestre, { tipo: 'mapa', id: 'vila', nome: 'Vila', dados: comObjetos([objetoNovo('inicio', 'inicio-1', 0, 0), porta('floresta', 1, 1)]) });
    await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 1, motivo: 'primeira tentativa' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/impedem a publicação.*bloqueado/) });
    await salvarRascunho(mestre, 'mapa', 'vila', { revisao: 1, dados: comObjetos([objetoNovo('inicio', 'inicio-1', 0, 0), porta('floresta', 2, 2)]) });
    await expect(publicarConteudo(mestre, 'mapa', 'vila', { revisao: 2, motivo: 'destino corrigido' })).resolves.toBeDefined();
    // mapa sem nada (aviso de isolado/sem início) publica normalmente
    await expect(publicarConteudo(mestre, 'mapa', 'floresta', { revisao: 1, motivo: 'mapa só com avisos' })).resolves.toBeDefined();
  });

  it('só vale para mapas; mapa inexistente dá 404', async () => {
    await expect(verificarMapaDoPainel(mestre, 'tileset', 'x1')).rejects.toMatchObject({ status: 400 });
    await expect(verificarMapaDoPainel(mestre, 'mapa', 'nao-existe')).rejects.toMatchObject({ status: 404 });
  });
});
