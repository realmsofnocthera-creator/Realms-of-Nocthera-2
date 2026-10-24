# Segredos e custos — Realms of Nocthera

Roadmap 6.5-10 e 6.5-11. Versão de 24/10/2026.

## 1. Inventário de segredos e configurações (6.5-10)

Nenhuma chave fica no código nem no repositório. O `.gitignore` bloqueia qualquer `.env`, e o CI falha se um commit novo
trouxer uma chave ou senha (gitleaks, no CI).

| Nome | O que é | Secreto? | Onde fica | Como trocar |
|---|---|---|---|---|
| `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` | Acesso ao armazenamento de imagens (Cloudflare R2) | **Sim** | Variáveis do Cloud Run | No Cloudflare, R2 > Gerenciar tokens de API: criar um token novo, trocar as duas variáveis no Cloud Run, publicar e só então apagar o token antigo. |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_PUBLIC_URL` | Conta, balde e endereço público das imagens | Não | Variáveis do Cloud Run | Só muda se o armazenamento mudar. |
| `TURNSTILE_SECRET_KEY` | Chave secreta do anti-bot (Cloudflare Turnstile) | **Sim** | Variáveis do Cloud Run | No Cloudflare, Turnstile > o site > Rotacionar chave secreta; trocar no Cloud Run e publicar. |
| `TURNSTILE_SITE_KEY` | Chave pública do anti-bot (vai para o navegador) | Não | Variáveis do Cloud Run | Junto com a secreta, se o site for recriado. |
| `MESTRE_DONO_UIDS` | Quem é Dono do Painel do Mestre | Não é senha, mas é sensível | Variáveis do Cloud Run | Editar a lista no Cloud Run e publicar. |
| `CSP_FRAME_ANCESTORS` | Quem pode mostrar o jogo dentro de um iframe | Não | Variáveis do Cloud Run (opcional) | — |
| Acesso do servidor ao Firebase | Conta de serviço do próprio Cloud Run (sem arquivo de chave) | — | Google Cloud | Não há chave para vazar; o acesso é o papel da conta de serviço. |
| `apiKey` em `firebase-applet-config.json` | Identifica o app Firebase no navegador | **Não** (pública por desenho) | Repositório | A proteção vem das regras do Firestore. Recomendado: restringir a chave aos domínios do jogo no Google Cloud (APIs e serviços > Credenciais > a chave > Restrições de aplicativo > Referenciadores HTTP). |

**Se um segredo vazar:** trocar na hora pelo passo da tabela, publicar, e conferir no log se houve uso estranho.

**Secret Manager:** fica para depois (decisão de 24/10/2026). Vale a pena quando houver mais gente com acesso ao Cloud
Run, porque aí o segredo deixa de aparecer para quem só edita o serviço.

## 2. Teto de instâncias do Cloud Run (6.5-11, item A)

Sem teto, um ataque de volume faz o Cloud Run subir muitas instâncias e a conta cresce junto. Com teto, o jogo fica lento
durante o ataque, mas o custo não dispara.

1. Abra o **Google Cloud Console** e vá em **Cloud Run**.
2. Clique no serviço do jogo e em **Editar e implantar nova revisão**.
3. Em **Escalonamento automático** (ou **Contêineres > Escalonamento**), ponha **Número máximo de instâncias: 3**. O mínimo
   pode ficar em 0.
4. Clique em **Implantar**.

Para o beta, 3 instâncias sobram. Suba o número quando o jogo crescer. Com menos instâncias, o limite de requisições por
instância também fica mais justo.

## 3. Alerta de orçamento (6.5-11, item B)

O alerta avisa por e-mail quando o gasto do mês chega perto do valor escolhido. Ele **não desliga nada sozinho**: é o aviso
para você agir (baixar o teto de instâncias, ligar a manutenção pelo Painel do Mestre).

1. No Google Cloud Console, vá em **Faturamento > Orçamentos e alertas**.
2. Clique em **Criar orçamento**.
3. Escopo: o projeto do jogo. Valor: o que você aceita gastar por mês (por exemplo, R$ 50 no beta).
4. Alertas em **50%, 90% e 100%** do valor, para os e-mails do faturamento.
5. Salve.
