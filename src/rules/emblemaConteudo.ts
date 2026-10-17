import { ATTRIBUTES, type AttributeName } from '@/rules/attributes';
import type { TipoEmblema } from '@/rules/emblemasCatalogo';
import type { ResultadoValidacao } from '@/rules/mapa';

/**
 * Emblema no banco (3.5.3.2), formato 1: o publicado SUBSTITUI nome, lore, os 3 atributos e os textos das
 * habilidades do emblema do catálogo (o id é o do tipo). Raridade, estrelas e os efeitos no combate continuam no
 * código; a lista de habilidades só vale se tiver o mesmo tamanho da do código (uma por estrela).
 */
export const FORMATO_DO_EMBLEMA = 1;

export interface EmblemaDados {
  formato: typeof FORMATO_DO_EMBLEMA;
  nome: string;
  lore: string;
  atributos: [AttributeName, AttributeName, AttributeName];
  habilidades: { nome: string; descricao: string }[];
}

const CHAVES = ['formato', 'nome', 'lore', 'atributos', 'habilidades'] as const;

function texto(v: unknown, min: number, max: number): string | null {
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length >= min && t.length <= max ? t : null;
}

export function validarEmblema(bruto: unknown): ResultadoValidacao<EmblemaDados> {
  const erros: string[] = [];
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return { ok: false, erros: ['O emblema precisa ser um objeto.'] };
  const b = bruto as Record<string, unknown>;
  const extras = Object.keys(b).filter((k) => !(CHAVES as readonly string[]).includes(k));
  if (extras.length) erros.push(`Campos desconhecidos no emblema: ${extras.join(', ')}.`);
  if (b.formato !== FORMATO_DO_EMBLEMA) erros.push(`Formato do emblema não suportado (esperado ${FORMATO_DO_EMBLEMA}).`);
  const nome = texto(b.nome, 2, 80);
  if (nome === null) erros.push('Nome: de 2 a 80 caracteres.');
  const lore = texto(b.lore, 0, 600);
  if (lore === null && b.lore !== '') erros.push('Lore: até 600 caracteres.');

  let atributos: EmblemaDados['atributos'] = ['forca', 'sorte', 'agilidade'];
  if (!Array.isArray(b.atributos) || b.atributos.length !== 3 || !b.atributos.every((a) => typeof a === 'string' && (ATTRIBUTES as readonly string[]).includes(a))) {
    erros.push('Atributos: escolha 3 atributos válidos.');
  } else if (new Set(b.atributos).size !== 3) erros.push('Atributos: os 3 precisam ser diferentes.');
  else atributos = b.atributos as EmblemaDados['atributos'];

  const habilidades: EmblemaDados['habilidades'] = [];
  if (!Array.isArray(b.habilidades) || b.habilidades.length < 3 || b.habilidades.length > 4) erros.push('Habilidades: de 3 a 4 (uma por estrela).');
  else {
    b.habilidades.forEach((h, i) => {
      const o = typeof h === 'object' && h !== null ? (h as Record<string, unknown>) : {};
      const extra = Object.keys(o).filter((k) => k !== 'nome' && k !== 'descricao');
      const n = texto(o.nome, 2, 80);
      const d = texto(o.descricao, 2, 600);
      if (extra.length || n === null || d === null) erros.push(`Habilidade ${i + 1}: nome (2 a 80) e descrição (2 a 600 caracteres).`);
      else habilidades.push({ nome: n, descricao: d });
    });
  }

  if (erros.length) return { ok: false, erros };
  return { ok: true, dados: { formato: FORMATO_DO_EMBLEMA, nome: nome!, lore: lore ?? '', atributos, habilidades } };
}

export function emblemaDadosDeTipo(t: TipoEmblema): EmblemaDados {
  return { formato: FORMATO_DO_EMBLEMA, nome: t.nome, lore: t.lore, atributos: [...t.atributos], habilidades: t.habilidades.map((h) => ({ ...h })) };
}

/** O tipo com os dados publicados por cima. A lista de habilidades só troca se tiver o mesmo tamanho da do código. */
export function tipoComDados(base: TipoEmblema, dados: EmblemaDados): TipoEmblema {
  return {
    ...base,
    nome: dados.nome,
    lore: dados.lore,
    atributos: [...dados.atributos],
    habilidades: dados.habilidades.length === base.habilidades.length ? dados.habilidades.map((h) => ({ ...h })) : base.habilidades,
  };
}
