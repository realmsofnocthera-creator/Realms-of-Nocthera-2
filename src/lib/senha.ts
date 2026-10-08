/**
 * Política de senha para contas novas (0.5-A4).
 * O Firebase Auth aceita 6 caracteres por padrão; o cadastro do jogo exige mais.
 * Contas antigas com senha mais curta continuam entrando normalmente.
 */
export const SENHA_TAMANHO_MINIMO = 8;
export const SENHA_TAMANHO_MAXIMO = 128;

/**
 * Valida a senha escolhida no cadastro.
 * Retorna a mensagem de erro para o jogador ou null se a senha for aceita.
 */
export function validarSenhaNova(senha: string): string | null {
  if (typeof senha !== 'string' || senha.length < SENHA_TAMANHO_MINIMO) {
    return `A senha deve conter no mínimo ${SENHA_TAMANHO_MINIMO} caracteres.`;
  }
  if (senha.length > SENHA_TAMANHO_MAXIMO) {
    return `A senha deve conter no máximo ${SENHA_TAMANHO_MAXIMO} caracteres.`;
  }
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha deve conter pelo menos uma letra e um número.';
  }
  return null;
}

/**
 * Traduz o código de erro do Firebase Auth para uma mensagem que não revela
 * se o e-mail possui conta e não expõe detalhes internos.
 */
export function mensagemErroAutenticacao(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Não foi possível criar a conta com este e-mail. Se ele já é seu, entre ou recupere a senha.';
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return `A senha deve conter no mínimo ${SENHA_TAMANHO_MINIMO} caracteres, com letras e números.`;
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Erro de conexão de rede. Verifique sua internet e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta está desativada.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'O login com o Google foi cancelado.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Este método de login está indisponível no momento.';
    default:
      return 'Ocorreu um erro durante a autenticação. Tente novamente.';
  }
}
