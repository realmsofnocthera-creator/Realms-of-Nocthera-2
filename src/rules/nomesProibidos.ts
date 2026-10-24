/**
 * Filtro de nomes e textos dos jogadores (6.5-13, pedido do Yuri em 24/10/2026): só as ofensas mais pesadas
 * (xingamentos obscenos, insultos racistas, homofóbicos e de ódio, apologia a crime), em português e inglês.
 * Vale para o nome do personagem, o nome e a descrição da guilda e o "Sobre" do perfil.
 *
 * A comparação ignora maiúsculas, acentos, letras repetidas e troca de letras por números ("c4r4lh0", "caaaralho").
 * Para não barrar palavras inocentes ("disputa", "computador", "Lucas"), há duas listas:
 * - PARTES: palavras longas e sem duplo sentido, achadas mesmo dentro de outra palavra ou com espaços no meio;
 * - PALAVRAS: palavras curtas ou que aparecem dentro de outras, achadas só como palavra inteira.
 */

const PARTES = [
  // português: obscenidades
  'caralho', 'buceta', 'boceta', 'xoxota', 'piroca', 'punheta', 'arrombado', 'arrombada', 'filhodaputa', 'filhadaputa',
  'fudido', 'fodido', 'foderam', 'fodase', 'vagabunda', 'putaria', 'chupapau', 'chupapica',
  // português: insultos de ódio
  'traveco', 'macacoimundo', 'negromacaco',
  // ódio e crime
  'nazista', 'nazismo', 'hitler', 'heilhitler', 'siegheil', 'kukluxklan', 'estuprador', 'estupro', 'pedofilo', 'pedofilia',
  // inglês
  'fuck', 'motherfucker', 'nigger', 'nigga', 'faggot', 'whore', 'pussy', 'pedophile',
] as const;

const PALAVRAS = [
  // curtas ou que existem dentro de palavras inocentes ("disputa", "Scunthorpe", "therapist")
  'puta', 'putas', 'puto', 'cu', 'cuzao', 'foder', 'fdp', 'viado', 'viadao', 'bicha', 'sapatao', 'crioulo',
  'nazi', 'rape', 'rapist', 'cunt', 'fag', 'fags', 'cock', 'slut', 'bitch', 'kike', 'chink', 'spic', 'retard',
] as const;

const TROCAS: Readonly<Record<string, string>> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i' };

/** Sem acento, minúsculo, números trocados por letras e letras repetidas juntadas ("CaaRaLh0" → "caralho"). */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[0134578@$!]/g, (c) => TROCAS[c] ?? c)
    .replace(/(.)\1+/g, '$1');
}

const PARTES_NORMAIS = PARTES.map(normalizar);
const PALAVRAS_NORMAIS = new Set(PALAVRAS.map(normalizar));

/** O texto tem uma ofensa pesada da lista? */
export function temOfensa(texto: string): boolean {
  const normal = normalizar(texto);
  const corrido = normal.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  if (PARTES_NORMAIS.some((p) => corrido.includes(p))) return true;
  return normal.split(/[^a-z]+/).some((p) => p && PALAVRAS_NORMAIS.has(p));
}

export const MENSAGEM_DE_NOME_PROIBIDO = 'Esse nome tem uma palavra que não é permitida no jogo. Escolha outro.';
export const MENSAGEM_DE_TEXTO_PROIBIDO = 'Esse texto tem uma palavra que não é permitida no jogo. Reescreva sem ela.';
