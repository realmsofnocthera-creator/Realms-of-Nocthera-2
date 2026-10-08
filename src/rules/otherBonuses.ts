import { CharacterDocument } from '@/server/characterService';

export interface OtherBonus {
  id: string;
  nome: string;
  explicacao: string;
}

/**
 * Retorna os outros bônus ativos do personagem.
 * (alimentado no futuro por equipamentos e outros sistemas)
 */
export function getCharacterOtherBonuses(_character?: CharacterDocument | null): OtherBonus[] {
  return [];
}
