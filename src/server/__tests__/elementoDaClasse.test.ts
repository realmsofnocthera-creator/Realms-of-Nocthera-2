import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as elementoPost } from '@/app/api/character/elemento/route';
import { limparCacheRevogacao } from '@/server/auth';
import { combatenteDoPersonagem, createCharacter, escolherElementoDaClasse, getCharacterByUid } from '@/server/characterService';
import { personagemDoFirestore, personagemParaFirestore } from '@/server/persistencia/firestore';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 5, agilidade: 0 };

describe('Elemento do Feiticeiro (1.5.2): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    await createCharacter('f1', { nome: 'Merlin', racaId: 'elfo', classeId: 'feiticeiro', pontos: PONTOS });
    await createCharacter('c1', { nome: 'Arthur', racaId: 'elfo', classeId: 'cavaleiro', pontos: { ...PONTOS, inteligencia: 0, forca: 5 } });
  });

  it('o Feiticeiro escolhe e troca o elemento; ele entra no combatente e é gravado', async () => {
    await escolherElementoDaClasse('f1', 'fogo');
    const c = await escolherElementoDaClasse('f1', 'sombrio');
    expect(c.elementoDaClasse).toBe('sombrio');
    const doBanco = (await getCharacterByUid('f1'))!;
    expect(combatenteDoPersonagem(doBanco).elementoDaClasse).toBe('sombrio');
    expect(personagemDoFirestore('f1', personagemParaFirestore(doBanco)).elementoDaClasse).toBe('sombrio');
    expect(personagemDoFirestore('f1', { ...personagemParaFirestore(doBanco), elementoDaClasse: 'agua' }).elementoDaClasse).toBeUndefined();
  });

  it('recusa elemento inválido e outras classes', async () => {
    await expect(escolherElementoDaClasse('f1', 'agua')).rejects.toThrow(/7 elementos/);
    await expect(escolherElementoDaClasse('c1', 'fogo')).rejects.toThrow(/Só o Feiticeiro/);
  });

  it('rota', async () => {
    const req = (uid: string, corpo: unknown) =>
      new NextRequest('http://t/api/character/elemento', { method: 'POST', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    const ok = await elementoPost(req('f1', { elemento: 'vento' }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).character.elementoDaClasse).toBe('vento');
    expect((await elementoPost(req('c1', { elemento: 'vento' }))).status).toBe(400);
  });
});
