import type { SeloDeBusca } from '@/rules/colecionaveis';
import type { RaridadeMaterial } from '@/rules/raridades';

/**
 * A arte da tela da Expedição (pixel art do Yuri, grade 360 x 540): as peças em `/images/expedicao` e as animações em
 * `/images/expedicao/animacoes` (carimbos e pops tocam uma vez; brilhos e selos, em laço). Geradas por
 * `scripts/expedicao/converter.py`.
 */
const PASTA = '/images/expedicao';

export const peca = (nome: string): string => `${PASTA}/${nome}.webp`;
export const animacao = (nome: string): string => `${PASTA}/animacoes/${nome}.webp`;

export const EXPEDICAO_UI = {
  cenario: peca('cenario'),
  fita: peca('fita-titulo'),
  vagaLivre: peca('vaga-livre'),
  vagaAndamento: peca('vaga-andamento'),
  vagaPronta: peca('vaga-pronta'),
  barraTrilho: peca('barra-trilho'),
  barraPreenchimento: peca('barra-preenchimento'),
  fechar: peca('btn-fechar'),
  ampulheta: peca('avanco-ampulheta'),
  ouro: peca('ouro'),
  fragmentoDeMemoria: peca('fragmento-memoria'),
  pedraDaRecordacao: peca('pedra-recordacao'),
} as const;

export type TipoDeBotao = 'ouro' | 'carmesim';
export type EstadoDoBotao = 'normal' | 'pressionado' | 'desativado';
export const botao = (tipo: TipoDeBotao, estado: EstadoDoBotao): string => peca(`btn-${tipo}-${estado}`);

export const turno = (horas: number): string => peca(`turno-${horas}h`);

export const MATERIAL_POR_RARIDADE: Readonly<Record<RaridadeMaterial, string>> = {
  comum: peca('material-comum'),
  raro: peca('material-raro'),
  muitoRaro: peca('material-muito-raro'),
  epico: peca('material-epico'),
  lendario: peca('material-lendario'),
};

export const SELO_ESTATICO: Readonly<Record<SeloDeBusca, string>> = {
  desgastado: peca('selo-desgastado'),
  encantado: peca('selo-encantado'),
  eternidade: peca('selo-eternidade'),
  origem: peca('selo-origem'),
};

export const SELO_EM_LACO: Readonly<Record<SeloDeBusca, string>> = {
  desgastado: animacao('selo-desgastado-loop'),
  encantado: animacao('selo-encantado-loop'),
  eternidade: animacao('selo-eternidade-loop'),
  origem: animacao('selo-origem-loop'),
};

export const ANIMACOES_DA_EXPEDICAO = {
  carimboEnviar: animacao('carimbo-enviar'),
  carimboColetar: animacao('carimbo-coletar'),
  vagaProntaBrilho: animacao('vaga-pronta-brilho'),
  barraBrilho: animacao('barra-progresso-brilho'),
  turnoSelecionado: animacao('turno-selecionado-brilho'),
} as const;

/** O pop de uma recompensa (surge com salto e faíscas e fica parado no item). */
export const POP = {
  ouro: animacao('pop-ouro'),
  fragmentoDeMemoria: animacao('pop-fragmento-memoria'),
  pedraDaRecordacao: animacao('pop-pedra-recordacao'),
  ampulheta: animacao('pop-avanco-ampulheta'),
  material: {
    comum: animacao('pop-material-comum'),
    raro: animacao('pop-material-raro'),
    muitoRaro: animacao('pop-material-muito-raro'),
    epico: animacao('pop-material-epico'),
    lendario: animacao('pop-material-lendario'),
  } as Readonly<Record<RaridadeMaterial, string>>,
  selo: {
    desgastado: animacao('pop-selo-desgastado'),
    encantado: animacao('pop-selo-encantado'),
    eternidade: animacao('pop-selo-eternidade'),
    origem: animacao('pop-selo-origem'),
  } as Readonly<Record<SeloDeBusca, string>>,
} as const;

/** Quanto dura (ms) o carimbo na tela antes de sair. */
export const DURACAO_DO_CARIMBO_MS = 1300;
