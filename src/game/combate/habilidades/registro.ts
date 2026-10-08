import { HABILIDADES_PADRAO, PASSIVAS_PADRAO } from './kitsPadrao';
import { DefinicaoHabilidade, DefinicaoPassiva } from './tipos';

const habilidades = new Map<string, DefinicaoHabilidade>();
const passivas = new Map<string, DefinicaoPassiva>();

/**
 * Os kits padrão são carregados na primeira consulta ao registro (1.1.9), em vez de por
 * efeito colateral ao importar combat.ts. Assim qualquer código que consulte o registro
 * (motor, servidor ou teste) vê os mesmos kits, sem depender da ordem de importação.
 */
let kitsPadraoCarregados = false;

/** Registra os kits padrão que ainda não estiverem no registro (idempotente). */
export function carregarKitsPadrao(): void {
  kitsPadraoCarregados = true;
  for (const hab of HABILIDADES_PADRAO) {
    if (!habilidades.has(hab.id)) habilidades.set(hab.id, hab);
  }
  for (const passiva of PASSIVAS_PADRAO) {
    if (!passivas.has(passiva.id)) passivas.set(passiva.id, passiva);
  }
}

function garantirKitsPadrao(): void {
  if (!kitsPadraoCarregados) carregarKitsPadrao();
}

export function registrarHabilidade(def: DefinicaoHabilidade): void {
  if (habilidades.has(def.id)) {
    throw new Error(`Habilidade com id "${def.id}" já está registrada.`);
  }
  habilidades.set(def.id, def);
}

export function obterHabilidade(id: string): DefinicaoHabilidade | undefined {
  garantirKitsPadrao();
  return habilidades.get(id);
}

export function registrarPassiva(def: DefinicaoPassiva): void {
  if (passivas.has(def.id)) {
    throw new Error(`Passiva com id "${def.id}" já está registrada.`);
  }
  passivas.set(def.id, def);
}

export function obterPassiva(id: string): DefinicaoPassiva | undefined {
  garantirKitsPadrao();
  return passivas.get(id);
}

/**
 * Esvazia o registro e NÃO recarrega os kits padrão sozinho depois disso: o teste começa
 * com o registro vazio e registra só o que precisa (ou chama registrarHabilidadesDeSubclasse).
 */
export function limparRegistroParaTestes(): void {
  habilidades.clear();
  passivas.clear();
  kitsPadraoCarregados = true;
}
