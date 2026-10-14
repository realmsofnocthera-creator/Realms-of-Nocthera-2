/**
 * Raridades dos emblemas da Provação do Guerreiro (Yuri, 14/10/2026): Comum, Raro, Muito raro, Épico, Lendário e
 * Mítico. Nesta primeira versão o emblema é só a raridade (sem nome nem efeito); o catálogo e os efeitos vêm depois.
 */
export type EmblemaRaridade = 'comum' | 'raro' | 'muitoRaro' | 'epico' | 'lendario' | 'mitico';

export interface DefinicaoEmblemaRaridade {
  id: EmblemaRaridade;
  nome: string;
  cor: string;
}

export const EMBLEMA_RARIDADES: readonly DefinicaoEmblemaRaridade[] = [
  { id: 'comum', nome: 'Comum', cor: '#B8B8B8' },
  { id: 'raro', nome: 'Raro', cor: '#5FCB6A' },
  { id: 'muitoRaro', nome: 'Muito raro', cor: '#5AA7F0' },
  { id: 'epico', nome: 'Épico', cor: '#C27BF0' },
  { id: 'lendario', nome: 'Lendário', cor: '#F3B13C' },
  { id: 'mitico', nome: 'Mítico', cor: '#FF5A5A' },
];

export const EMBLEMA_RARIDADE_MAP: Readonly<Record<EmblemaRaridade, DefinicaoEmblemaRaridade>> = Object.fromEntries(
  EMBLEMA_RARIDADES.map((r) => [r.id, r])
) as Record<EmblemaRaridade, DefinicaoEmblemaRaridade>;

export function ehEmblemaRaridade(v: unknown): v is EmblemaRaridade {
  return typeof v === 'string' && v in EMBLEMA_RARIDADE_MAP;
}
