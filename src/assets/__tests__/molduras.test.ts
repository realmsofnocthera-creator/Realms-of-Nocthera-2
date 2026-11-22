import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { srcDaMoldura, srcDoTitulo } from '../molduras';
import { ehMoldura, MOLDURA_MAP, MOLDURAS, molduraDoPersonagem, molduraEscolhida } from '@/rules/molduras';
import { TITULOS } from '@/rules/titulos';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('molduras do avatar e faixas dos títulos', () => {
  it('são 22 molduras (10 ranques, 4 do Campeonato, 7 de categoria e a do Chefe Mundial), 7 animadas', () => {
    expect(MOLDURAS).toHaveLength(22);
    expect(new Set(MOLDURAS.map((m) => m.id)).size).toBe(22);
    expect(MOLDURAS.filter((m) => m.grupo === 'ranque')).toHaveLength(10);
    expect(MOLDURAS.filter((m) => m.grupo === 'campeonato')).toHaveLength(4);
    expect(MOLDURAS.filter((m) => m.grupo === 'categoria')).toHaveLength(7);
    expect(MOLDURAS.filter((m) => m.animada).map((m) => m.id).sort()).toEqual(['campeonato-4', 'categoria-forja', 'chefe-mundial', 'ranque-ascendente', 'ranque-eterno', 'ranque-soberano', 'ranque-transcendente']);
    for (const m of MOLDURAS) expect(m.titulo || m.categoria, m.id).toBeTruthy();
  });

  it('toda moldura tem a arte (e a animada, o loop), toda faixa de título existe, e não sobra arquivo', () => {
    const esperados = new Set<string>();
    for (const m of MOLDURAS) {
      for (const url of [srcDaMoldura(m.id), ...(m.animada ? [srcDaMoldura(m.id, true)] : [])]) {
        expect(existsSync(join(publico, url)), url).toBe(true);
        esperados.add(url.split('/').pop()!);
      }
    }
    expect(srcDaMoldura('ranque-recruta', true)).toBe('/images/molduras/ranque-recruta.webp');
    for (const f of readdirSync(join(publico, 'images/molduras'))) expect(esperados.has(f), f).toBe(true);
    const faixas = new Set(TITULOS.map((t) => `${t.id}.webp`));
    expect(TITULOS).toHaveLength(27);
    for (const t of TITULOS) {
      const url = srcDoTitulo(t.id);
      expect(existsSync(join(publico, url)), url).toBe(true);
      expect(statSync(join(publico, url)).size).toBeLessThanOrEqual(350 * 1024);
    }
    for (const f of readdirSync(join(publico, 'images/titulos'))) expect(faixas.has(f), f).toBe(true);
  });

  it('a liberação: o título libera as do ranque, do Campeonato e do Chefe Mundial; o 5º degrau, a da categoria', () => {
    expect(molduraDoPersonagem({})).toEqual([]);
    expect(molduraDoPersonagem({ titulos: ['gladiador-da-arena', 'campeao-do-chefe-mundial', 'bicampeao-de-nocthera'] }).map((m) => m.id)).toEqual(['ranque-gladiador', 'campeonato-2', 'chefe-mundial']);
    // 4 degraus não bastam; 5 sim (qualquer conquista da categoria)
    expect(molduraDoPersonagem({ conquistas: { torre: 4 } })).toEqual([]);
    expect(molduraDoPersonagem({ conquistas: { torre: 5 } }).map((m) => m.id)).toEqual(['categoria-provacoes']);
    expect(molduraDoPersonagem({ conquistas: { vitorias: 5, forja: 5 } }).map((m) => m.id)).toEqual(['categoria-monstros', 'categoria-forja']);
  });

  it('a moldura escolhida só vale se o jogador ainda a tem', () => {
    expect(molduraEscolhida({ molduraId: 'ranque-eterno', titulos: ['eterno-da-arena'] })?.id).toBe('ranque-eterno');
    expect(molduraEscolhida({ molduraId: 'ranque-eterno', titulos: [] })).toBeNull();
    expect(molduraEscolhida({ molduraId: 'falsa' })).toBeNull();
    expect(molduraEscolhida({})).toBeNull();
    expect(ehMoldura('chefe-mundial')).toBe(true);
    expect(ehMoldura('x')).toBe(false);
    expect(MOLDURA_MAP['chefe-mundial'].titulo).toBe('campeao-do-chefe-mundial');
  });
});
