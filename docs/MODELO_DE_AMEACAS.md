# Modelo de ameaças — Realms of Nocthera

Roadmap 6.5-1. Versão de 24/10/2026. Revisar sempre que entrar um sistema que move valor entre jogadores (comércio,
leilão, PvP) ou dinheiro real (loja VIP).

O princípio geral é o mesmo desde a Etapa 0.5: **o servidor é a fonte da verdade**. O navegador só mostra o resultado;
toda regra, sorteio, recompensa e saldo é decidido e gravado no servidor, numa transação do Firestore.

## O que protegemos

| Ativo | Por que importa |
|---|---|
| Moedas (ouro, Diamantes, fragmentos, essências) | Duplicar moeda quebra a economia e, com a loja VIP, vira prejuízo real. |
| Cartas da Alma e emblemas | São os itens mais raros; com comércio, passam a ter valor entre jogadores. |
| Progresso (nível, Torre, conquistas, rankings) | Rankings e recompensas de ranking dependem de progresso honesto. |
| Contas dos jogadores | Roubo de conta tira o progresso de quem jogou. |
| Painel do Mestre | Quem entra nele dá qualquer coisa a qualquer um. |

## Quem ataca

- **Jogador curioso:** abre o DevTools, reenvia requisições, troca valores no corpo.
- **Farmer com script:** automatiza lutas e buscas para acumular moeda ou subir no ranking.
- **Dono de várias contas:** cria contas para pegar recompensas de início várias vezes e repassar (quando houver comércio).
- **Atacante externo:** tenta tokens forjados, força bruta, ou acesso direto ao banco.

## Ameaças, o que já cobre e o que falta

| Ameaça | Como seria | O que já cobre | O que falta |
|---|---|---|---|
| **Duplicação de moeda ou item** | Clique duplo, duas abas, reenvio do mesmo pedido | Toda mudança roda em transação (0.5-C2); o combate é idempotente pelo `combateId` (0.5-B3); resgates (Correio, baús, Check-in, conquistas, Chefe de guildas) conferem o estado dentro da transação e não pagam duas vezes. Testes de reenvio e de requisições simultâneas no CI (6.5-8). | Rever cada fluxo novo de comércio quando existir (6.5-9). |
| **Moeda mexida sem extrato** | Código com defeito ou edição direta no banco | Ledger (6.5-3): cada linha guarda saldo antes e depois; no fim de cada transação, o saldo final tem de bater com o extrato (nos testes, falha; em produção, cria uma linha "sem registro", avisa no log e põe o jogador na fila de revisão). A ficha do jogador no Painel do Mestre confere o extrato com o saldo. | — |
| **Corpo da requisição manipulado** | Mandar `diamantes: 9999`, quantidades negativas, tipos trocados, `__proto__` | As rotas só leem os campos esperados e validam tipo e faixa; valores de recompensa nunca vêm do cliente. Testes de corpo manipulado no CI (6.5-8). | — |
| **Manipulação de semente** | Escolher a semente do sorteio para sempre ganhar | A semente é sempre do servidor; a do cliente é ignorada (0.5-B1) e fica gravada para replay. | — |
| **Manipulação de relógio** | Adiantar o relógio do aparelho para coletar expedição ou zerar o dia | Todo tempo (dia de Brasília, semana, expedições, Check-in) é a hora do servidor. | — |
| **Automação de requisições (bots)** | Script que luta e busca sem parar | Limite por IP e por conta com bloqueio progressivo (0.5-A3), com o IP tirado do fim do `X-Forwarded-For` (o que o cliente põe na frente não vale). Detecção de anomalias (6.5-4): ações, ouro e níveis por hora acima do teto e ritmo regular demais mandam o jogador para a fila de revisão do Painel do Mestre. Anti-bot na criação do personagem com Cloudflare Turnstile (6.5-5), grátis e sem limite: liga quando as chaves estão no Cloud Run. | O limite de requisições é por instância do Cloud Run e some ao reiniciar. Calibrar os tetos no beta. |
| **Multiconta** | Várias contas para pegar recompensas de início | No máximo 3 contas novas por rede em 24 horas (6.5-6); a 4ª é barrada e vai para a fila de revisão com as contas da mesma rede. Só se guarda uma marca curta do IP (não o IP), por 24 horas. O e-mail confirmado já vem no login, pronto para ser exigido no comércio. | Exigir o e-mail confirmado quando o comércio existir. |
| **Token forjado ou roubado** | JWT assinado por outro, token antigo depois do logout | Validação da assinatura do Firebase, projeto e expiração; revogação por logout; testes de token antigo, HS256 e de outro projeto no CI. | — |
| **Acesso direto ao banco** | Usar o SDK do Firebase no navegador para gravar no Firestore | Regras do Firestore: o cliente nunca grava `characters` nem `transactions`; só lê o próprio documento. | — |
| **Invasão do Painel do Mestre** | Conta de Mestre comprometida | Só o Dono (uid no ambiente) e papéis concedidos por ele; sessão curta de 30 minutos para ações do painel; tudo no log administrativo. | Segundo fator do painel antes do beta aberto. |
| **Abuso de estorno** | Comprar Diamantes, gastar e pedir estorno | — (não há compra ainda) | Na loja VIP (8.5): marcar a compra, tirar o que foi dado no estorno e sancionar reincidência. |
| **Win-trading e transferência para conta principal** | Duas contas combinando resultado ou passando itens | — (não há PvP nem comércio ainda) | 6.5-9: resultado só no servidor, limites e período de segurança em transferências. |

## Resposta a incidentes

1. Confirmar pelo extrato (ficha do jogador no Painel do Mestre) e pelo log.
2. Sancionar a conta, sempre com motivo; fica no log administrativo:
   - advertir;
   - suspender ou banir;
   - limite silencioso (6.5-7): a conta joga, mas sai dos rankings e só recebe a recompensa mínima do Chefe Mundial e do Chefe de guildas, sem aviso. Serve para a suspeita que ainda não justifica suspender.
   - O jogador suspenso ou banido pode pedir apelação pelo jogo (um pedido por sanção). O pedido vai para a fila de revisão, e a resposta (aceitar levanta a sanção) aparece para ele na tela da conta.
3. Corrigir o saldo pelo ajuste do Mestre (gera linha no extrato com o motivo).
4. Se for defeito do jogo, corrigir o código com teste que reproduz o ataque antes de publicar.
