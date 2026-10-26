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
  { id: 'recruta-da-arena', nome: 'Recruta da Arena', origem: 'Terminar a semana no ranque Recruta da Arena ranqueada (pelo Correio)' },
  { id: 'combatente-da-arena', nome: 'Combatente da Arena', origem: 'Terminar a semana no ranque Combatente da Arena ranqueada (pelo Correio)' },
  { id: 'veterano-da-arena', nome: 'Veterano da Arena', origem: 'Terminar a semana no ranque Veterano da Arena ranqueada (pelo Correio)' },
  { id: 'gladiador-da-arena', nome: 'Gladiador da Arena', origem: 'Terminar a semana no ranque Gladiador da Arena ranqueada (pelo Correio)' },
  { id: 'elite-da-arena', nome: 'Elite da Arena', origem: 'Terminar a semana no ranque Elite da Arena ranqueada (pelo Correio)' },
  { id: 'campeao-da-arena', nome: 'Campeão da Arena', origem: 'Terminar a semana no ranque Campeão da Arena ranqueada (pelo Correio)' },
  { id: 'ascendente-da-arena', nome: 'Ascendente da Arena', origem: 'Terminar a semana no ranque Ascendente da Arena ranqueada (pelo Correio)' },
  { id: 'soberano-da-arena', nome: 'Soberano da Arena', origem: 'Terminar a semana no ranque Soberano da Arena ranqueada (pelo Correio)' },
  { id: 'transcendente-da-arena', nome: 'Transcendente da Arena', origem: 'Terminar a semana no ranque Transcendente da Arena ranqueada (pelo Correio)' },
  { id: 'campeao-de-nocthera', nome: 'Campeão de Nocthera', origem: 'Ganhar 1 Campeonato (pelo Correio)' },
  { id: 'bicampeao-de-nocthera', nome: 'Bicampeão de Nocthera', origem: 'Ganhar 2 Campeonatos (pelo Correio)' },
  { id: 'tricampeao-de-nocthera', nome: 'Tricampeão de Nocthera', origem: 'Ganhar 3 Campeonatos (pelo Correio)' },
  { id: 'lenda-de-nocthera', nome: 'Lenda de Nocthera', origem: 'Ganhar 5 Campeonatos (pelo Correio)' },
  { id: 'eterno-da-arena', nome: 'Eterno da Arena', origem: 'Terminar a semana no ranque Eterno da Arena ranqueada (pelo Correio)' },
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
