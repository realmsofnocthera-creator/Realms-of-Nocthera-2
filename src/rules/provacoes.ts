export type ProvacaoId =
  | 'teste-equipe'
  | 'expedicao'
  | 'cacada'
  | 'chefe-mundial'
  | 'batalha-sangrenta'
  | 'torre-celestial'
  | 'guerreiro';

export type ProvacaoAssetKey =
  | 'provacao-teste-equipe'
  | 'provacao-cacada'
  | 'provacao-chefe-mundial'
  | 'provacao-batalha-sangrenta'
  | 'provacao-torre-celestial'
  | 'provacao-guerreiro';

export interface ProvacaoDefinition {
  id: ProvacaoId;
  nome: string;
  nivelRequerido: number;
  /** A arte do card (com o título na imagem). Sem arte, o card mostra o nome escrito. */
  assetKey?: ProvacaoAssetKey;
}

export const PROVACOES: readonly ProvacaoDefinition[] = [
  {
    id: 'teste-equipe',
    nome: 'Teste de Equipe',
    nivelRequerido: 25,
    assetKey: 'provacao-teste-equipe',
  },
  {
    // No lugar da Provação de Dungeons (Yuri, 22/10/2026); a arte ainda não existe
    id: 'expedicao',
    nome: 'Expedição',
    nivelRequerido: 15,
  },
  {
    id: 'cacada',
    nome: 'Provação da Caçada',
    nivelRequerido: 2,
    assetKey: 'provacao-cacada',
  },
  {
    id: 'chefe-mundial',
    nome: 'Provação de Chefe Mundial',
    nivelRequerido: 18,
    assetKey: 'provacao-chefe-mundial',
  },
  {
    id: 'batalha-sangrenta',
    nome: 'Provação de Batalha Sangrenta',
    nivelRequerido: 20,
    assetKey: 'provacao-batalha-sangrenta',
  },
  {
    id: 'torre-celestial',
    nome: 'Provação da Torre Celestial',
    nivelRequerido: 5,
    assetKey: 'provacao-torre-celestial',
  },
  {
    id: 'guerreiro',
    nome: 'Provação do Guerreiro',
    nivelRequerido: 12,
    assetKey: 'provacao-guerreiro',
  },
] as const;
