import { describe, it, expect } from 'vitest';
import { ensaioDaLimpeza, executarLimpeza, FRASE_DA_LIMPEZA } from '@/server/limpezaMestre';
import type { SessaoMestre } from '@/server/mestre';

const dono: SessaoMestre = { uid: 'dono1', email: 'mineirosangela1@gmail.com', papel: 'dono', origem: 'ambiente' };

describe('limpeza de jogadores pelo Painel do Mestre: as travas', () => {
  it('a frase de confirmação traz o projeto', () => {
    expect(FRASE_DA_LIMPEZA).toMatch(/^APAGAR gen-lang-client-/);
  });

  it('só o papel Dono, e só com o e-mail do dono, ensaia ou apaga', async () => {
    const outroPapel: SessaoMestre = { ...dono, papel: 'admin' as SessaoMestre['papel'] };
    await expect(ensaioDaLimpeza(outroPapel)).rejects.toMatchObject({ status: 403 });
    await expect(executarLimpeza(outroPapel, FRASE_DA_LIMPEZA)).rejects.toMatchObject({ status: 403 });
    const outroEmail: SessaoMestre = { ...dono, email: 'outro@exemplo.com' };
    await expect(ensaioDaLimpeza(outroEmail)).rejects.toMatchObject({ status: 403 });
    await expect(executarLimpeza(outroEmail, FRASE_DA_LIMPEZA)).rejects.toMatchObject({ status: 403 });
  });

  it('sem a frase exata, não apaga (400), antes de tocar em qualquer dado', async () => {
    for (const confirmar of [undefined, '', 'apagar', 'APAGAR', FRASE_DA_LIMPEZA.toLowerCase(), `${FRASE_DA_LIMPEZA} `]) {
      await expect(executarLimpeza(dono, confirmar)).rejects.toMatchObject({ status: 400 });
    }
  });
});
