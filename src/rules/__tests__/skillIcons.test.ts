import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { RACES } from '../races';
import { CLASSES } from '../classes';
import {
  RACE_SKILL_ICONS,
  CLASS_SKILL_ICONS,
  getRaceSkillIcon,
  getClassSkillIcon,
} from '../skillIcons';

describe('skillIcons', () => {
  it('contém mapeamento para todos os racaId definidos em races.ts', () => {
    for (const race of RACES) {
      expect(RACE_SKILL_ICONS[race.id]).toBeDefined();
      expect(typeof RACE_SKILL_ICONS[race.id].ativa).toBe('string');
      expect(typeof RACE_SKILL_ICONS[race.id].passiva).toBe('string');
    }
  });

  it('contém mapeamento para todos os classeId definidos em classes.ts com exatamente 5 ícones', () => {
    for (const cls of CLASSES) {
      expect(CLASS_SKILL_ICONS[cls.id]).toBeDefined();
      expect(CLASS_SKILL_ICONS[cls.id]).toHaveLength(5);
      for (const iconPath of CLASS_SKILL_ICONS[cls.id]) {
        expect(typeof iconPath).toBe('string');
      }
    }
  });

  it('aponta ativa e passiva do anão para o mesmo caminho /icons/skills/anao-ativa.png', () => {
    expect(RACE_SKILL_ICONS['anao'].ativa).toBe('/icons/skills/anao-ativa.png');
    expect(RACE_SKILL_ICONS['anao'].passiva).toBe('/icons/skills/anao-ativa.png');
  });

  it('nenhum caminho de ícone começa com http', () => {
    for (const raceEntry of Object.values(RACE_SKILL_ICONS)) {
      expect(raceEntry.ativa.startsWith('http')).toBe(false);
      expect(raceEntry.passiva.startsWith('http')).toBe(false);
    }
    for (const classIcons of Object.values(CLASS_SKILL_ICONS)) {
      for (const iconPath of classIcons) {
        expect(iconPath.startsWith('http')).toBe(false);
      }
    }
  });

  it('getRaceSkillIcon retorna o caminho correto ou null para entradas inválidas', () => {
    expect(getRaceSkillIcon('humano', 'ativa')).toBe('/icons/skills/humano-ativa.png');
    expect(getRaceSkillIcon('humano', 'passiva')).toBe('/icons/skills/humano-passiva.png');
    expect(getRaceSkillIcon('Humano', 'ativa')).toBe('/icons/skills/humano-ativa.png');
    expect(getRaceSkillIcon('invalido', 'ativa')).toBeNull();
    expect(getRaceSkillIcon('', 'ativa')).toBeNull();
    expect(getRaceSkillIcon(null as unknown as string, 'ativa')).toBeNull();
  });

  it('getClassSkillIcon retorna o caminho correto ou null para entradas inválidas', () => {
    expect(getClassSkillIcon('barbaro', 0)).toBe('/icons/skills/barbaro-1.png');
    expect(getClassSkillIcon('barbaro', 4)).toBe('/icons/skills/barbaro-5.png');
    expect(getClassSkillIcon('Barbaro', 0)).toBe('/icons/skills/barbaro-1.png');
    expect(getClassSkillIcon('barbaro', -1)).toBeNull();
    expect(getClassSkillIcon('barbaro', 5)).toBeNull();
    expect(getClassSkillIcon('invalido', 0)).toBeNull();
    expect(getClassSkillIcon('', 0)).toBeNull();
    expect(getClassSkillIcon(null as unknown as string, 0)).toBeNull();
  });

  it('todos os arquivos referenciados existem no diretório public/icons/skills/', () => {
    const publicDir = path.resolve(process.cwd(), 'public');

    // Verificar ícones de raças
    for (const raceEntry of Object.values(RACE_SKILL_ICONS)) {
      const ativaFile = path.join(publicDir, raceEntry.ativa);
      const passivaFile = path.join(publicDir, raceEntry.passiva);
      expect(fs.existsSync(ativaFile), `Arquivo ${ativaFile} deve existir`).toBe(true);
      expect(fs.existsSync(passivaFile), `Arquivo ${passivaFile} deve existir`).toBe(true);
    }

    // Verificar ícones de classes
    for (const classIcons of Object.values(CLASS_SKILL_ICONS)) {
      for (const iconPath of classIcons) {
        const file = path.join(publicDir, iconPath);
        expect(fs.existsSync(file), `Arquivo ${file} deve existir`).toBe(true);
      }
    }
  });
});
