import { DefinicaoHabilidade, DefinicaoPassiva } from './tipos';

const habilidades = new Map<string, DefinicaoHabilidade>();
const passivas = new Map<string, DefinicaoPassiva>();

export function registrarHabilidade(def: DefinicaoHabilidade): void {
  if (habilidades.has(def.id)) {
    throw new Error(`Habilidade com id "${def.id}" já está registrada.`);
  }
  habilidades.set(def.id, def);
}

export function obterHabilidade(id: string): DefinicaoHabilidade | undefined {
  return habilidades.get(id);
}

export function registrarPassiva(def: DefinicaoPassiva): void {
  if (passivas.has(def.id)) {
    throw new Error(`Passiva com id "${def.id}" já está registrada.`);
  }
  passivas.set(def.id, def);
}

export function obterPassiva(id: string): DefinicaoPassiva | undefined {
  return passivas.get(id);
}

export function limparRegistroParaTestes(): void {
  habilidades.clear();
  passivas.clear();
}
