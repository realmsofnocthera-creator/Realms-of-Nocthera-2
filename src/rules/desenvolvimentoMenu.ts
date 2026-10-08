import { DESENVOLVIMENTO_ASSETS } from './desenvolvimentoAssets';

export type DesenvolvimentoSecaoId =
  | 'atributos'
  | 'subclasse'
  | 'melhorarHabilidade'
  | 'avancoHabilidade'
  | 'maestrias';

export interface DesenvolvimentoMenuItem {
  id: DesenvolvimentoSecaoId;
  label: string;
  icone: string;
  disponivel: boolean;
}

export const DESENVOLVIMENTO_MENU: readonly DesenvolvimentoMenuItem[] = [
  {
    id: 'atributos',
    label: 'Distribuição de Atributos',
    icone: DESENVOLVIMENTO_ASSETS.iconeDistribuicao,
    disponivel: true,
  },
  {
    id: 'subclasse',
    label: 'Subclasse',
    icone: DESENVOLVIMENTO_ASSETS.iconeSubclasse,
    disponivel: false,
  },
  {
    id: 'melhorarHabilidade',
    label: 'Melhorar Habilidade',
    icone: DESENVOLVIMENTO_ASSETS.botaoMelhorarHabilidade,
    disponivel: false,
  },
  {
    id: 'avancoHabilidade',
    label: 'Avanço de Habilidade',
    icone: DESENVOLVIMENTO_ASSETS.botaoAvancarHabilidade,
    disponivel: false,
  },
  {
    id: 'maestrias',
    label: 'Maestrias',
    icone: DESENVOLVIMENTO_ASSETS.iconeMaestrias,
    disponivel: false,
  },
] as const;

export const DESENVOLVIMENTO_SECAO_PADRAO = 'atributos';
