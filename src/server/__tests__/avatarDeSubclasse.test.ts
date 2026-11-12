import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, escolherSubclasse, getCharacterByUid, resetarSubclasse, updateCharacter, updateCharacterAvatar } from '@/server/characterService';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import { AVATARES_DE_SUBCLASSE, AVATARES_DISPONIVEIS, avatarLiberado, avataresLiberados, getAvatarById, subclassesDesbloqueadasDe } from '@/rules/avatars';
import { SUBCLASSES } from '@/rules/subclasses';
import { AVATAR_FACE_FRAMING, AVATAR_IMAGES, resolveAvatarSrc } from '@/assets/avatars';

describe('Avatares das subclasses: o retrato e o personagem abrem ao desbloquear a subclasse', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  async function personagem(uid: string, classeId = 'barbaro') {
    await createCharacter(uid, { nome: 'Heroi_' + uid, racaId: 'humano', classeId, pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } });
    return updateCharacter(uid, { nivel: 20, ouro: 100000, fragmentosAlma: 100, diamantes: 300 });
  }

  it('cada avatar de subclasse aponta para uma subclasse que existe e tem imagem e enquadramento do rosto', () => {
    expect(AVATARES_DE_SUBCLASSE.map((a) => a.id)).toEqual(['berserker', 'colosso', 'vanguarda', 'bastiao', 'arquimago', 'sabio_arcano']);
    for (const a of AVATARES_DE_SUBCLASSE) {
      expect(SUBCLASSES.some((s) => s.id === a.subclasseId)).toBe(true);
      expect(AVATAR_IMAGES[a.assetKey]).toBeTruthy();
      expect(AVATAR_FACE_FRAMING[a.id].scale).toBeGreaterThan(1);
      expect(getAvatarById(a.id)).toBe(a);
      expect(resolveAvatarSrc(a.id, 'barbaro')).toBe(AVATAR_IMAGES[a.assetKey]);
    }
  });

  it('as regras: as classes abrem sempre; as subclasses só depois de desbloquear (mesmo guardadas ou ativa agora)', () => {
    expect(avataresLiberados({})).toHaveLength(AVATARES_DISPONIVEIS.length);
    const berserker = getAvatarById('berserker')!;
    expect(avatarLiberado(berserker, {})).toBe(false);
    expect(avatarLiberado(berserker, { subclasseAtualId: 'berserker' })).toBe(true);
    expect(avatarLiberado(berserker, { subclassesDesbloqueadas: ['berserker'] })).toBe(true);
    expect(avatarLiberado(getAvatarById('colosso')!, { subclassesDesbloqueadas: ['berserker'] })).toBe(false);
    expect(subclassesDesbloqueadasDe({ subclassesDesbloqueadas: ['berserker'], subclasseAtualId: 'colosso' }).sort()).toEqual(['berserker', 'colosso']);
    expect(avataresLiberados({ subclasseAtualId: 'berserker' }).map((a) => a.id)).toContain('berserker');
  });

  it('na criação do personagem não dá para escolher um avatar de subclasse', async () => {
    await expect(createCharacter('uid_av_cria', { nome: 'Heroi_cria', racaId: 'humano', classeId: 'barbaro', avatarId: 'berserker', pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } })).rejects.toThrow(/Avatar inválido/i);
  });

  it('sem a subclasse o servidor recusa; ao desbloquear libera e grava a subclasse desbloqueada; depois do reset o avatar continua liberado', async () => {
    await personagem('uid_av_a');
    await expect(updateCharacterAvatar('uid_av_a', 'berserker')).rejects.toThrow(/desbloqueia a subclasse/i);

    const aposEscolher = await escolherSubclasse('uid_av_a', 'berserker');
    expect(aposEscolher.subclassesDesbloqueadas).toEqual(['berserker']);
    expect((await updateCharacterAvatar('uid_av_a', 'berserker')).avatarId).toBe('berserker');
    // o avatar do outro Bárbaro continua fechado
    await expect(updateCharacterAvatar('uid_av_a', 'colosso')).rejects.toThrow(/desbloqueia a subclasse/i);

    const aposReset = await resetarSubclasse('uid_av_a');
    expect(aposReset.subclasseAtualId).toBeNull();
    expect(aposReset.subclassesDesbloqueadas).toEqual(['berserker']);
    expect((await updateCharacterAvatar('uid_av_a', 'profeta')).avatarId).toBe('profeta');
    expect((await updateCharacterAvatar('uid_av_a', 'berserker')).avatarId).toBe('berserker');
    expect((await getCharacterByUid('uid_av_a'))?.subclassesDesbloqueadas).toEqual(['berserker']);
  });

  it('quem já tinha subclasse antes do campo existir também abre o avatar dela (sem migração)', async () => {
    await personagem('uid_av_b');
    await escolherSubclasse('uid_av_b', 'colosso');
    const atual = await getCharacterByUid('uid_av_b');
    expect(subclassesDesbloqueadasDe({ subclasseAtualId: atual?.subclasseAtualId })).toEqual(['colosso']);
  });
});
