import { describe, it, expect, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { mapaVazio } from '@/rules/mapa';
import { criarRepositorioFirestore } from '@/server/persistencia/firestore';
import { ErroPersistencia, type ConteudoDocumento, type Repositorio } from '@/server/persistencia/tipos';

type Dados = Record<string, unknown>;

/** Firestore mínimo em memória com o que o conteúdo versionado usa: transação, subcoleção, where, orderBy e select. */
class FirestoreFalso {
  docs = new Map<string, Dados>();
  falha: { code: number } | null = null;

  private checar() {
    if (this.falha) throw Object.assign(new Error('falha'), this.falha);
  }

  private consulta(caminho: string, filtros: ((d: Dados) => boolean)[] = [], ordem?: [string, 'asc' | 'desc'], limite?: number, campos?: string[]) {
    const fs = this;
    return {
      where: (campo: string, _op: '==', valor: unknown) => fs.consulta(caminho, [...filtros, (d) => d[campo] === valor], ordem, limite, campos),
      orderBy: (campo: string, sentido: 'asc' | 'desc' = 'asc') => fs.consulta(caminho, filtros, [campo, sentido], limite, campos),
      limit: (n: number) => fs.consulta(caminho, filtros, ordem, n, campos),
      select: (...c: string[]) => fs.consulta(caminho, filtros, ordem, limite, c),
      get: async () => {
        let itens = [...fs.docs.entries()]
          .filter(([c]) => c.startsWith(caminho + '/') && !c.slice(caminho.length + 1).includes('/'))
          .map(([c, d]) => ({ id: c.slice(caminho.length + 1), d }))
          .filter(({ d }) => filtros.every((f) => f(d)));
        if (ordem) itens.sort((a, b) => (Number(a.d[ordem[0]]) - Number(b.d[ordem[0]])) * (ordem[1] === 'desc' ? -1 : 1));
        if (limite !== undefined) itens = itens.slice(0, limite);
        return {
          docs: itens.map(({ id, d }) => ({
            id,
            data: () => (campos ? Object.fromEntries(Object.entries(structuredClone(d)).filter(([k]) => campos.includes(k))) : structuredClone(d)),
          })),
        };
      },
    };
  }

  private ref(caminho: string): Dados {
    const fs = this;
    return {
      caminho,
      get: async () => ({ exists: fs.docs.has(caminho), data: () => (fs.docs.has(caminho) ? structuredClone(fs.docs.get(caminho)) : undefined) }),
      set: async (d: Dados) => {
        fs.checar();
        fs.docs.set(caminho, structuredClone(d));
      },
      create: async (d: Dados) => {
        fs.checar();
        if (fs.docs.has(caminho)) throw Object.assign(new Error('já existe'), { code: 6 });
        fs.docs.set(caminho, structuredClone(d));
      },
      collection: (nome: string) => fs.colecao(`${caminho}/${nome}`),
    };
  }

  private colecao(caminho: string) {
    return { ...this.consulta(caminho), doc: (id: string) => this.ref(`${caminho}/${id}`) };
  }

  collection(nome: string) {
    return this.colecao(nome);
  }

  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    const pendentes: [string, Dados, boolean][] = [];
    const tx = {
      get: async (ref: { get: () => Promise<unknown> }) => ref.get(),
      set: (ref: { caminho: string }, d: Dados) => pendentes.push([ref.caminho, structuredClone(d), false]),
      create: (ref: { caminho: string }, d: Dados) => pendentes.push([ref.caminho, structuredClone(d), true]),
    };
    const valor = await fn(tx);
    this.checar();
    for (const [c, , criar] of pendentes) if (criar && this.docs.has(c)) throw Object.assign(new Error('já existe'), { code: 6 });
    for (const [c, d] of pendentes) this.docs.set(c, d);
    return valor;
  }
}

const doc = (): ConteudoDocumento => ({
  chave: 'mapa__vila',
  tipo: 'mapa',
  id: 'vila',
  nome: 'Vila',
  revisao: 1,
  rascunho: { camadas: [1, 2, 3] },
  hashRascunho: 'h1',
  editadoEm: '2026-10-15T00:00:00.000Z',
  editadoPor: 'm1',
  criadoEm: '2026-10-15T00:00:00.000Z',
  criadoPor: 'm1',
  versaoPublicada: null,
  hashPublicado: null,
  ultimaVersao: 0,
});

const versao = (hash: string) => ({ dados: { hash }, hash, publicadoEm: '2026-10-15T01:00:00.000Z', publicadoPor: 'm1', motivo: 'teste', origem: 'publicacao' as const, revertidaDe: null });

describe('Conteúdo no Firestore', () => {
  let fs: FirestoreFalso;
  let repo: Repositorio;

  beforeEach(() => {
    fs = new FirestoreFalso();
    repo = criarRepositorioFirestore(fs as unknown as Firestore);
  });

  it('cria uma vez, lê de volta e a lista não traz o rascunho', async () => {
    expect(await repo.criarConteudo(doc())).toBe(true);
    expect(await repo.criarConteudo(doc())).toBe(false);
    expect(await repo.lerConteudo('mapa__vila')).toEqual(doc());
    expect(fs.docs.get('conteudo/mapa__vila')).not.toHaveProperty('chave');
    const lista = await repo.listarConteudos('mapa');
    expect(lista).toHaveLength(1);
    expect(lista[0]).not.toHaveProperty('rascunho');
    expect(lista[0]).toMatchObject({ chave: 'mapa__vila', nome: 'Vila', revisao: 1 });
  });

  it('salvar o rascunho confere a revisão dentro da transação', async () => {
    await repo.criarConteudo(doc());
    expect(await repo.salvarRascunhoConteudo('outro', 1, { rascunho: 1, hashRascunho: 'x', editadoEm: '', editadoPor: '' })).toBe('inexistente');
    const salvo = await repo.salvarRascunhoConteudo('mapa__vila', 1, { rascunho: { novo: true }, hashRascunho: 'h2', editadoEm: 'agora', editadoPor: 'm2' });
    expect(salvo).toMatchObject({ revisao: 2, hashRascunho: 'h2', rascunho: { novo: true } });
    expect(await repo.salvarRascunhoConteudo('mapa__vila', 1, { rascunho: {}, hashRascunho: 'h3', editadoEm: '', editadoPor: '' })).toBe('conflito');
  });

  it('publicar cria a versão na subcoleção e numera em sequência; o histórico vem do mais novo e sem os dados', async () => {
    await repo.criarConteudo(doc());
    const r1 = await repo.publicarVersaoConteudo('mapa__vila', { revisao: 1 }, versao('a'));
    expect(r1).toMatchObject({ conteudo: { versaoPublicada: 1, ultimaVersao: 1, hashPublicado: 'a' }, versao: { versao: 1 } });
    expect(await repo.publicarVersaoConteudo('mapa__vila', { ultimaVersao: 0 }, versao('b'))).toBe('conflito');
    await repo.publicarVersaoConteudo('mapa__vila', { ultimaVersao: 1 }, { ...versao('c'), origem: 'reversao', revertidaDe: 1 });
    expect(fs.docs.has('conteudo/mapa__vila/versoes/2')).toBe(true);

    const historico = await repo.listarVersoesConteudo('mapa__vila', 10);
    expect(historico.map((v) => v.versao)).toEqual([2, 1]);
    expect(historico[0]).toMatchObject({ origem: 'reversao', revertidaDe: 1 });
    expect(historico[0]).not.toHaveProperty('dados');
    expect((await repo.lerVersaoConteudo('mapa__vila', 1))?.dados).toEqual({ hash: 'a' });
    expect(await repo.lerVersaoConteudo('mapa__vila', 9)).toBeNull();
    expect((await repo.lerConteudo('mapa__vila'))?.versaoPublicada).toBe(2);
  });

  it('falha do banco vira ErroPersistencia e não aplica nada', async () => {
    await repo.criarConteudo(doc());
    fs.falha = { code: 14 };
    await expect(repo.publicarVersaoConteudo('mapa__vila', { revisao: 1 }, versao('a'))).rejects.toBeInstanceOf(ErroPersistencia);
    await expect(repo.criarConteudo({ ...doc(), chave: 'mapa__outra', id: 'outra' })).rejects.toBeInstanceOf(ErroPersistencia);
    fs.falha = null;
    expect((await repo.lerConteudo('mapa__vila'))?.versaoPublicada).toBeNull();
    expect(fs.docs.has('conteudo/mapa__vila/versoes/1')).toBe(false);
  });

  describe('mapas grandes (comprimidos no banco)', () => {
    const grande = () => {
      const m = { ...mapaVazio(200, 180), tilesets: ['floresta'] };
      for (let i = 0; i < m.camadas.chao.length; i++) m.camadas.chao[i] = i % 11 === 0 ? 2 : 1;
      m.camadas.colisao[777] = 1;
      return m;
    };

    it('grava as camadas como texto, lê de volta como listas (rascunho e versão) e o banco fica bem menor', async () => {
      const m = grande();
      await repo.criarConteudo({ ...doc(), rascunho: m });
      const guardado = fs.docs.get('conteudo/mapa__vila') as { rascunho: { camadas: Record<string, unknown> } };
      expect(typeof guardado.rascunho.camadas.chao).toBe('string');
      expect(JSON.stringify(guardado).length).toBeLessThan(JSON.stringify(m).length / 3);
      expect((await repo.lerConteudo('mapa__vila'))?.rascunho).toEqual(m);

      const r = await repo.publicarVersaoConteudo('mapa__vila', { revisao: 1 }, { ...versao('a'), dados: m });
      expect(r).not.toBe('conflito');
      expect(typeof (fs.docs.get('conteudo/mapa__vila/versoes/1') as { dados: { camadas: { chao: unknown } } }).dados.camadas.chao).toBe('string');
      expect((await repo.lerVersaoConteudo('mapa__vila', 1))?.dados).toEqual(m);
      if (typeof r !== 'string') expect(r.versao.dados).toEqual(m); // quem publica recebe as listas
    });

    it('salvar o rascunho de novo também comprime; mapas pequenos e outros tipos ficam como estão', async () => {
      await repo.criarConteudo({ ...doc(), rascunho: mapaVazio(10, 10) });
      expect((fs.docs.get('conteudo/mapa__vila') as { rascunho: { camadas: { chao: unknown } } }).rascunho.camadas.chao).toEqual(new Array(100).fill(0));
      const m = grande();
      const salvo = await repo.salvarRascunhoConteudo('mapa__vila', 1, { rascunho: m, hashRascunho: 'h2', editadoEm: 'agora', editadoPor: 'm2' });
      expect(typeof salvo).toBe('object');
      expect(typeof (fs.docs.get('conteudo/mapa__vila') as { rascunho: { camadas: { chao: unknown } } }).rascunho.camadas.chao).toBe('string');
      expect((await repo.lerConteudo('mapa__vila'))?.rascunho).toEqual(m);

      await repo.criarConteudo({ ...doc(), chave: 'cena__a', tipo: 'cena', id: 'a', rascunho: { camadas: { chao: [1, 2, 3] }, largura: 300, altura: 300 } });
      expect((await repo.lerConteudo('cena__a'))?.rascunho).toEqual({ camadas: { chao: [1, 2, 3] }, largura: 300, altura: 300 });
      expect((fs.docs.get('conteudo/cena__a') as { rascunho: { camadas: { chao: unknown } } }).rascunho.camadas.chao).toEqual([1, 2, 3]);
    });

    it('mapa grande antigo, já em listas no banco, continua lendo normalmente', async () => {
      const m = grande();
      fs.docs.set('conteudo/mapa__vila', { ...(({ chave: _c, ...resto }) => resto)(doc()), rascunho: m });
      expect((await repo.lerConteudo('mapa__vila'))?.rascunho).toEqual(m);
    });
  });
});
