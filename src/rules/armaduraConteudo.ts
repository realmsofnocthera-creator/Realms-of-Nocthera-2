import { RARIDADES_ARMA, type RaridadeArma, type ReceitaArma } from '@/rules/armas';
import type { PecaArmadura } from '@/rules/armaduras';
import { copiarReceita, validarReceita } from '@/rules/armaConteudo';
import type { ResultadoValidacao } from '@/rules/mapa';

/**
 * Peça de armadura no banco (3.5.3.2), formato 1: o publicado SUBSTITUI nome, raridade, receita e o estado
 * "ativo" da peça do catálogo (o id é o da peça). Conjunto, estilo, espaço, estrela e habilidades continuam no
 * código. `ativo: false` impede fabricar a peça (quem já tem continua com ela).
 */
export const FORMATO_DA_ARMADURA = 1;

export interface ArmaduraDados {
  formato: typeof FORMATO_DA_ARMADURA;
  nome: string;
  raridade: RaridadeArma;
  receita: ReceitaArma;
  ativo: boolean;
}

const CHAVES = ['formato', 'nome', 'raridade', 'receita', 'ativo'] as const;

export function validarArmadura(bruto: unknown): ResultadoValidacao<ArmaduraDados> {
  const erros: string[] = [];
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return { ok: false, erros: ['A peça precisa ser um objeto.'] };
  const b = bruto as Record<string, unknown>;
  const extras = Object.keys(b).filter((k) => !(CHAVES as readonly string[]).includes(k));
  if (extras.length) erros.push(`Campos desconhecidos na peça: ${extras.join(', ')}.`);
  if (b.formato !== FORMATO_DA_ARMADURA) erros.push(`Formato da peça não suportado (esperado ${FORMATO_DA_ARMADURA}).`);
  if (typeof b.ativo !== 'boolean') erros.push('Ativo: sim ou não.');
  if (typeof b.raridade !== 'string' || !RARIDADES_ARMA.some((r) => r.id === b.raridade)) erros.push('Raridade inválida.');
  const nome = typeof b.nome === 'string' ? b.nome.trim() : '';
  if (nome.length < 2 || nome.length > 60) erros.push('Nome: de 2 a 60 caracteres.');
  const receita = validarReceita(b.receita, erros);
  if (erros.length) return { ok: false, erros };
  return { ok: true, dados: { formato: FORMATO_DA_ARMADURA, nome, raridade: b.raridade as RaridadeArma, receita, ativo: b.ativo as boolean } };
}

export function armaduraDadosDePeca(p: PecaArmadura): ArmaduraDados {
  return { formato: FORMATO_DA_ARMADURA, nome: p.nome, raridade: p.raridade, receita: copiarReceita(p.receita), ativo: true };
}

export function pecaComDados(base: PecaArmadura, dados: ArmaduraDados): PecaArmadura {
  return { ...base, nome: dados.nome, raridade: dados.raridade, receita: copiarReceita(dados.receita) };
}
