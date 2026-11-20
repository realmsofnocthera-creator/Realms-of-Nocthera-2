import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** O monstro fica à esquerda do herói e a arte do Yuri olha para a esquerda: a luta tem de espelhar a animação dele. */
describe('monstro virado para o herói', () => {
  it('o combate e o painel da Torre espelham a animação do monstro', () => {
    const raiz = join(__dirname, '..', '..', '..');
    const combate = readFileSync(join(raiz, 'components/cacada/CombateCacada.tsx'), 'utf8');
    const trecho = combate.slice(combate.indexOf('parado={animacaoMonstro.parado}'), combate.indexOf('parado={animacaoMonstro.parado}') + 300);
    expect(trecho).toContain('espelhado');
    const torre = readFileSync(join(raiz, 'components/torreCelestial/TorreCelestialScreen.tsx'), 'utf8');
    expect(torre.slice(torre.indexOf('<SpriteAnimado'), torre.indexOf('<SpriteAnimado') + 400)).toContain('espelhado');
  });
});
