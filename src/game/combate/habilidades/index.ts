export type {
  EspacoHabilidade,
  TipoDanoHabilidade,
  AlvoHabilidade,
  AtacanteHabilidade,
  ContextoHabilidade,
  ResultadoHabilidade,
  DefinicaoHabilidade,
  ModificadoresPassiva,
  DefinicaoPassiva,
} from './tipos';

export {
  registrarHabilidade,
  obterHabilidade,
  registrarPassiva,
  obterPassiva,
  limparRegistroParaTestes,
} from './registro';

export { resolverDanoHabilidade } from './resolver';
export { obterSlotAcionado } from './slot';
export { registrarHabilidadesDeSubclasse } from './registrarSubclasses';
export { aplicarPassivasDanoDaClasse, separarPassivasDanoDaClasse } from './danoBase';
export { obterModificadoresPassivaSubclasse } from './passivas';
