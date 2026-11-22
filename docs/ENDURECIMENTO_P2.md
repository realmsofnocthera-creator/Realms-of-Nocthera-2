# Endurecimento P2: o que está no código e o que o Yuri precisa fazer na nuvem

Itens da auditoria P2 (8 a 13). Tudo marcado "proposta, a confirmar" ainda depende da decisão do Yuri.

## 8. Regra de `users/{uid}` (feito no código)
`firestore.rules`: o e-mail gravado tem que ser o do próprio login (`request.auth.token.email`) e ter até 254 caracteres.
O app só grava o documento quando o login tem e-mail. **Publicar as regras** (`firebase deploy --only firestore:rules`) é por conta do Yuri.

## 9. Rate limit distribuído (proposta, a confirmar)
O limitador de `src/server/rateLimit.ts` é por instância: com N instâncias o limite efetivo vira N vezes maior.
- **Já (barato):** deixar o Cloud Run com no máximo 1 instância enquanto o jogo é pequeno:
  `gcloud run services update realms-of-nocthera --region=us-central1 --max-instances=1`
  Custo: nenhum a mais (gasta menos). Risco: com muita gente ao mesmo tempo, as requisições esperam na fila (a instância atende várias ao mesmo tempo, `--concurrency` padrão 80) e uma instância parada reinicia sem estado. Não ligar antes de confirmar.
- **Definitivo:** Redis (Memorystore) com contagem atômica por chave. Tem custo fixo mensal (algumas dezenas de dólares no menor tamanho) e exige rede VPC no Cloud Run. **Só com aprovação de custo.**
- Nada foi mudado em `cloudbuild.yaml` (ele manteria o valor atual do serviço).

## 10. Idempotência nas compras (feito no código)
Loja, Loja de Moedas VIP e Mercado (anunciar, comprar, cancelar) aceitam `idempotencyKey` (8 a 64 letras, números, `_` ou `-`).
O resultado fica no próprio personagem (`idempotencia`, últimas 20 chaves das últimas 24 h), gravado na MESMA transação da compra. Repetir a chave devolve o resultado de antes sem cobrar de novo; a mesma chave em outra ação dá 409. Sem chave, tudo funciona como antes.
- **Custo no Firestore:** nenhuma leitura ou gravação nova (o campo vai na gravação que já existia; cresce poucos KB no documento).
- **Falta a tela:** o cliente deve gerar uma chave por toque (ex.: `crypto.randomUUID()`) e reenviar a MESMA ao repetir por timeout.
- Compras com dinheiro real já são idempotentes por pedido (confirmar e estornar). O provedor de teste não precisa.

## 11. Detector de robô
- **Feito:** teto de 1.200 lutas por hora por conta (`TETO_DE_COMBATE_POR_HORA`), em memória, sem custo no Firestore. Fica acima do sinal de revisão (600 ações/hora), então a revisão avisa antes. **Valor: proposta, a confirmar.**
- **Proposta, a confirmar:** teto diário de recompensas por conta (ouro e XP). Precisa de um número de design do Yuri e de um contador por dia no mesmo documento do personagem (sem leitura extra).
- **Proposta, a confirmar:** pedir Turnstile quando um sinal de revisão disparar. Exige um marcador na conta e o cliente mostrar o desafio; mexe na tela de combate.

## 13. Turnstile "fail-open" (decisão consciente, só alerta)
Se o Cloudflare cair, o jogo segue sem o desafio (melhor que travar o cadastro). O log `turnstile.indisponivel` (ERROR) precisa de um alerta. Rodar uma vez, no Cloud Shell, com permissão no projeto:

```bash
# 1) métrica por log
gcloud logging metrics create turnstile_indisponivel \
  --description="Turnstile fora do ar (fail-open)" \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.evento="turnstile.indisponivel"'
# 2) política de alerta: crie em Monitoring > Alertas, condição "Métrica baseada em registros"
#    turnstile_indisponivel, limite > 5 em 10 minutos, canal: seu e-mail.
```
(O log é uma linha JSON com `evento` e `severity: ERROR`.)

## 12. CI
Actions fixadas por SHA, Dependabot agrupado e `npm audit --omit=dev --audit-level=moderate` no CI.
