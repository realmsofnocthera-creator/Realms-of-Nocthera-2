/** Erros de sistema desligado e de manutenção (3.5.5.2). Arquivo sem imports, para não criar ciclos. */
export class ErroManutencao extends Error {
  readonly status = 503;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroManutencao';
  }
}

export class ErroSistemaDesligado extends Error {
  readonly status = 503;

  constructor(
    readonly sistema: string,
    mensagem: string
  ) {
    super(mensagem);
    this.name = 'ErroSistemaDesligado';
  }
}
