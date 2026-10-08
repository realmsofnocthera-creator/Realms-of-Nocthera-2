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
