import type { AplicacaoEfeitoDefensivo } from '@/game/combate/efeitosDefensivos';
import type { AplicacaoCura } from '@/game/combate/efeitosCura';

export type EspacoHabilidade = 'basico' | 'especial' | 'ultimate';
export type TipoDanoHabilidade = 'fisico' | 'magico';

export interface AlvoHabilidade {
  hp: number;
  hpMax: number;
  sobreescudo: number;
  mitigacaoFisica: number;
  mitigacaoMagica: number;
}

export interface AtacanteHabilidade {
  hp: number;
  hpMax: number;
  nivel: number;
}

export interface ContextoHabilidade {
  atacante: AtacanteHabilidade;
  alvo: AlvoHabilidade;
  danoBase: number;
  /** Bônus de dano em %, vindos de passivas (Instinto, Frenesi...), somados no mesmo grupo do bônus da habilidade. */
  bonusDanoExtraPercentual?: number;
}

export interface ResultadoHabilidade {
  nome: string;
  tipoDano: TipoDanoHabilidade;
  percentualDano: number; // 115 = 115% do danoBase
  ignorarDefesaPercentual: number; // 0 a 100
  bonusDanoPercentual: number; // bônus condicional somado (ex.: +30)
  bonusContraSobreescudoPercentual: number; // só vale se alvo.sobreescudo > 0
  curaPercentualDanoCausado: number;
  curaPercentualHpMax: number;
  /** Efeitos de Mitigação e defesa (catálogo 1.2) que a habilidade coloca em quem a usa. */
  efeitosNoUsuario?: AplicacaoEfeitoDefensivo[];
  /** Efeitos de Cura e restauração (catálogo 1.2) em quem usa a habilidade, aplicados depois do golpe. */
  efeitosCura?: AplicacaoCura[];
}

export interface DefinicaoHabilidade {
  id: string;
  espaco: EspacoHabilidade;
  tipoDano?: TipoDanoHabilidade;
  executar(ctx: ContextoHabilidade): ResultadoHabilidade;
}

export interface ModificadoresPassiva {
  bonusDanoFisicoPercentual: number;
  reducaoDanoFisicoRecebidoPercentual: number;
  bonusSobreescudoMaxPercentual: number;
}

export interface DefinicaoPassiva {
  id: string;
  modificadores(ctx: { hp: number; hpMax: number; nivel: number }): ModificadoresPassiva;
}
