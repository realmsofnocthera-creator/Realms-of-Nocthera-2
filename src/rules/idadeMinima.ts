/**
 * Idade mínima para jogar (decidido pelo Yuri em 28/10/2026): 16 anos, conferida pela data de nascimento que o jogador
 * informa no cadastro. É uma declaração, sem prova; um método mais seguro (ECA Digital) vem depois (roadmap 0.7.3.1).
 * A data de nascimento NÃO é guardada: o servidor só registra que a idade mínima foi confirmada e quando.
 */
export const IDADE_MINIMA = 16;
export const IDADE_MAXIMA_PLAUSIVEL = 120;

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Lê "AAAA-MM-DD" (o formato do campo de data do navegador). Retorna null se não for uma data real. */
export function lerDataDeNascimento(texto: unknown): { ano: number; mes: number; dia: number } | null {
  if (typeof texto !== 'string') return null;
  const m = FORMATO.exec(texto.trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return { ano, mes, dia };
}

/** Idade completa em anos na data `hoje` (UTC). */
export function calcularIdade(nascimento: { ano: number; mes: number; dia: number }, hoje: Date): number {
  let idade = hoje.getUTCFullYear() - nascimento.ano;
  const jaFezAniversario = hoje.getUTCMonth() + 1 > nascimento.mes || (hoje.getUTCMonth() + 1 === nascimento.mes && hoje.getUTCDate() >= nascimento.dia);
  if (!jaFezAniversario) idade -= 1;
  return idade;
}

/** Mensagem de erro para o jogador, ou null se a data é válida e a idade chega a 16 anos. */
export function validarIdadeMinima(texto: unknown, hoje: Date = new Date()): string | null {
  const nascimento = lerDataDeNascimento(texto);
  if (!nascimento) return 'Informe uma data de nascimento válida.';
  const idade = calcularIdade(nascimento, hoje);
  if (idade < 0 || idade > IDADE_MAXIMA_PLAUSIVEL) return 'Informe uma data de nascimento válida.';
  if (idade < IDADE_MINIMA) return `O jogo é permitido a partir de ${IDADE_MINIMA} anos.`;
  return null;
}
