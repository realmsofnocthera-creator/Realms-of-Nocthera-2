export type ProvacaoId =
  | 'teste-equipe'
  | 'dungeons'
  | 'cacada'
  | 'chefe-mundial'
  | 'batalha-sangrenta'
  | 'torre-celestial'
  | 'guerreiro';

export type ProvacaoAssetKey =
  | 'provacao-teste-equipe'
  | 'provacao-dungeons'
  | 'provacao-cacada'
  | 'provacao-chefe-mundial'
  | 'provacao-batalha-sangrenta'
  | 'provacao-torre-celestial'
  | 'provacao-guerreiro';

export interface ProvacaoDefinition {
  id: ProvacaoId;
  nome: string;
  nivelRequerido: number;
  assetKey: ProvacaoAssetKey;
}

export const PROVACOES: readonly ProvacaoDefinition[] = [
  {
    id: 'teste-equipe',
    nome: 'Teste de Equipe',
    nivelRequerido: 25,
    assetKey: 'provacao-teste-equipe',
  },
  {
    id: 'dungeons',
    nome: 'Provação de Dungeons',
    nivelRequerido: 15,
    assetKey: 'provacao-dungeons',
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
