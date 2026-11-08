/**
 * As falas curtas do Ferreiro (aparecem em uma caixa de diálogo quando a ferraria abre e quando se toca nele).
 * PROPOSTA do Claude, a confirmar com o Yuri: tom simples e direto, sem inventar lore nova. `{nome}` vira o nome do
 * personagem. Cada saudação tem até 3 linhas curtas, e o jogo sorteia uma a cada vez que a ferraria abre.
 */
export const SAUDACOES_DO_FERREIRO: readonly (readonly string[])[] = [
  ['Ah, {nome}! Chegou na hora certa: a forja nunca esteve tão quente.', 'Traga os materiais dos monstros e o ouro. O resto fica comigo e com o meu martelo.', 'O que vamos forjar hoje?'],
  ['Entre, entre! Cuidado com as faíscas, elas mordem.', 'Ferro bom guarda a lembrança da mão que o moldou. Eu sempre me lembro.', 'Diga o que precisa e eu coloco no fogo.'],
  ['Olha quem voltou, {nome}! A bigorna estava com saudade.', 'Armas e armaduras: de monstro pequeno sai peça simples, de monstro bravo sai lenda.', 'Escolha. A forja já está acesa.'],
];

/** Falas soltas, para quando se toca no Ferreiro depois da saudação. */
export const FALAS_SOLTAS_DO_FERREIRO: readonly string[] = [
  'Ainda falta uma martelada!',
  'Quem tem pressa come ferro cru.',
  'Armas boas nascem de monstros ruins.',
  'Um bom aço aguenta qualquer batalha.',
  'Se faltar material, vá caçar. Eu espero.',
];

export const NOME_DO_FERREIRO = 'Ferreiro';

/** Troca `{nome}` pelo nome do personagem. */
export const falaComNome = (fala: string, nome: string): string => fala.replace(/\{nome\}/g, nome);
