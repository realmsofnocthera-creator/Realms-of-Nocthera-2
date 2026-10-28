import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as criarRota } from '@/app/api/character/create/route';
import { getCharacterByUid } from '@/server/characterService';
import { VERSAO_DOS_TERMOS } from '@/rules/termos';
import { ACEITE_DE_TESTE } from '@/test/aceiteDeTeste';
import { tokenDeTeste } from '@/test/firebaseAdminMock';
import { limparCacheRevogacao } from '@/server/auth';
import { limparCacheDeSancoes } from '@/server/sancoes';

const PONTOS = { vigor: 5, sorte: 0, forca: 2, vitalidade: 3, arcano: 0, inteligencia: 0, agilidade: 0 };
const pedir = (uid: string, nome: string, aceite?: unknown) =>
  new NextRequest('http://t/api/character/create', {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json', 'x-forwarded-for': `10.9.${uid.length}.${nome.length}` },
    body: JSON.stringify({ nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS, ...(aceite === undefined ? {} : { aceite }) }),
  });

describe('Idade mínima e aceite dos Termos na criação do personagem', () => {
  beforeEach(() => {
    limparCacheRevogacao();
    limparCacheDeSancoes();
  });

  it('cria o personagem e grava o aceite (versão e hora), sem guardar a data de nascimento', async () => {
    const res = await criarRota(pedir('aceite_ok', 'Aceitante', ACEITE_DE_TESTE));
    expect(res.status).toBe(201);
    const gravado = await getCharacterByUid('aceite_ok');
    expect(gravado?.aceiteLegal?.termosVersao).toBe(VERSAO_DOS_TERMOS);
    expect(Number.isNaN(Date.parse(gravado?.aceiteLegal?.aceitoEm ?? ''))).toBe(false);
    expect(JSON.stringify(gravado)).not.toContain('1990-01-01');
  });

  it('recusa sem aceite, e nada é criado', async () => {
    const res = await criarRota(pedir('aceite_falta', 'SemAceite'));
    expect(res.status).toBe(400);
    expect(await getCharacterByUid('aceite_falta')).toBeNull();
  });

  it('recusa menor de 16 anos', async () => {
    const agora = new Date();
    const nasceu = `${agora.getUTCFullYear() - 15}-01-01`;
    const res = await criarRota(pedir('aceite_menor', 'Menorzinho', { ...ACEITE_DE_TESTE, dataNascimento: nasceu }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/16 anos/);
    expect(await getCharacterByUid('aceite_menor')).toBeNull();
  });

  it('recusa versão de termos que não é a atual', async () => {
    const res = await criarRota(pedir('aceite_versao', 'VersaoVelha', { ...ACEITE_DE_TESTE, termosVersao: 'outra' }));
    expect(res.status).toBe(400);
    expect(await getCharacterByUid('aceite_versao')).toBeNull();
  });
});
