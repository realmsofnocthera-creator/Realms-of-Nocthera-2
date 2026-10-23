/**
 * Títulos do perfil (decididos pelo Yuri em 23/10/2026): vêm das conquistas (o último degrau de algumas) e de
 * ranking e eventos (pelo Correio, inclusive mandados pelo Mestre). O jogador escolhe um para mostrar no perfil.
 * Os nomes são provisórios (a confirmar pelo Yuri).
 */
export interface TituloDefinition {
  id: string;
  nome: string;
  /** De onde vem, para a tela. */
  origem: string;
}

export const TITULOS: readonly TituloDefinition[] = [
  { id: 'veterano-de-guerra', nome: 'Veterano de Guerra', origem: 'Conquista Vitórias, 5º degrau' },
  { id: 'matador-de-chefes', nome: 'Matador de Chefes', origem: 'Conquista Vitórias contra chefes, 5º degrau' },
  { id: 'conquistador-da-torre', nome: 'Conquistador da Torre', origem: 'Conquista Torre Celestial, 5º degrau' },
  { id: 'mestre-guerreiro', nome: 'Mestre Guerreiro', origem: 'Conquista Provação do Guerreiro, 5º degrau' },
  { id: 'sanguinario', nome: 'Sanguinário', origem: 'Conquista Batalha Sangrenta, 5º degrau' },
  { id: 'provado-em-equipe', nome: 'Provado em Equipe', origem: 'Conquista Teste de Equipe, 5º degrau' },
  { id: 'cacador-de-soberanos', nome: 'Caçador de Soberanos', origem: 'Conquista Chefe Mundial, 5º degrau' },
  { id: 'mestre-ferreiro', nome: 'Mestre Ferreiro', origem: 'Conquista Forja, 5º degrau' },
  { id: 'explorador-incansavel', nome: 'Explorador Incansável', origem: 'Conquista Expedição, 5º degrau' },
  { id: 'colecionador-supremo', nome: 'Colecionador Supremo', origem: 'Conquista Colecionáveis, 5º degrau' },
  { id: 'maestre', nome: 'Maestre', origem: 'Conquista Maestria, 5º degrau' },
  { id: 'guardiao-de-almas', nome: 'Guardião de Almas', origem: 'Conquista Alma, 5º degrau' },
  { id: 'campeao-do-chefe-mundial', nome: 'Campeão do Chefe Mundial', origem: '1º lugar do dia no Chefe Mundial (pelo Correio)' },
];

export const TITULO_MAP: Readonly<Record<string, TituloDefinition>> = Object.fromEntries(TITULOS.map((t) => [t.id, t]));
export const ehTitulo = (v: unknown): v is string => typeof v === 'string' && !!TITULO_MAP[v];

/** Lê os títulos do jogador (sem repetidos e só os que existem). */
export function titulosDoDocumento(bruto: unknown): string[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = [...new Set(bruto.filter(ehTitulo))];
  return lista.length ? lista : undefined;
}

/** Soma títulos à lista do jogador, sem repetir. */
export const comTitulos = (atuais: readonly string[] | undefined, novos: readonly string[]) => [...new Set([...(atuais ?? []), ...novos.filter(ehTitulo)])];
