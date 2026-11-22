# Limpeza de jogadores (apagar todos, manter o dono)

`scripts/limpar-jogadores.mjs` apaga os dados de **todos** os jogadores, no Firestore e no Firebase Auth (logins e e-mails), e mantém só o dono (`mineirosangela1@gmail.com`, que precisa ser o Dono registrado em `DONOS_DO_PROJETO`, em `src/server/mestre.ts`). **É irreversível.**

## O que é apagado
- **Coleções inteiras (com subcoleções):** `guildas`, `nomesDeGuilda`, `partys`, `chat`, `mercado`, `mercadoPrecos`, `leilao`, `arena`, `arenaRanqueada`, `arenaReplays`, `campeonatos`, `chefeMundial`, `chefeSemanal`, `cadastrosDaRede`, `ranking`, `revisao`.
- **Tudo menos o do dono:** `characters`, `users` (os e-mails gravados no cadastro), `sancoes`, `revogacoes`, `transactions`, `combates`, `nomes`.
- **Firebase Auth:** todos os logins, menos o do dono.
- **No personagem do dono:** só os campos que apontavam para o que sumiu (guilda, party, convites, anúncios do Mercado). O resto do personagem dele fica.

## O que NUNCA é tocado
`mestres` (os papéis do painel), `configuracao`, `conteudo` (monstros, mapas, itens editados), `logAdmin` e `correioGeral`.
**Atenção:** se há outros Mestres (além do dono), os papéis deles ficam em `mestres`, mas os logins deles serão apagados como os de qualquer jogador. Eles precisam criar a conta de novo (o uid muda, então o papel antigo deixa de valer: recadastre-os no painel).

## Pelo celular: Painel do Mestre (sem terminal)
**Painel do Mestre → aba Papéis → "Limpeza de jogadores"** (só o Dono, com o login `mineirosangela1@gmail.com`):
1. **Ver o que seria apagado (ensaio)**: mostra as contagens, sem apagar nada.
2. Digite a frase `APAGAR gen-lang-client-0756716853` e toque em **Apagar todos os jogadores** (confirma de novo). Fica no log do painel.
3. Reinicie o Cloud Run depois, para limpar as memórias do servidor (as outras instâncias guardam sanções e nomes).
Se parar no meio (muitos dados ou a cota de 20 mil exclusões por dia do Spark), toque de novo: ele continua do que sobrou. **Sem backup.** Depois de usar, esta tela pode ser removida do app.

## Pelo terminal (computador): passo a passo
1. **Backup antes** (o Firestore não desfaz): `gcloud firestore export gs://SEU-BUCKET/antes-da-limpeza --project=gen-lang-client-0756716853 --database=ai-studio-realmsofnocthera-7113e23c-5465-4b0b-afbe-84aab53dd0f8` (precisa de um bucket e do plano com exportação). Se o backup agendado diário (`scripts/configurar-backup-firestore.sh`) estiver ativo, confirme que o último existe.
2. Entre com a conta dona do projeto: `gcloud auth application-default login`.
3. **Ensaio (não apaga nada):** `node scripts/limpar-jogadores.mjs`. Confira as contagens e o dono preservado.
4. **Apagar de verdade:** `node scripts/limpar-jogadores.mjs --executar --confirmar="APAGAR gen-lang-client-0756716853"`.
5. **Reinicie o serviço** (um novo deploy, ou `gcloud run services update realms-of-nocthera --region=us-central1 --update-env-vars=REINICIO=$(date +%s)`), para limpar as memórias do servidor (nomes, sanções, rate limit).
6. Se o ensaio avisar de mais de 15 mil exclusões, o plano Spark limita a 20 mil por dia: rode de novo no dia seguinte.

## Segurança do script
- Recusa se não achar o login do dono, ou se o uid dele não for o Dono do código.
- Sem `--executar` nunca apaga; com `--executar` exige a frase `APAGAR <projectId>`.
- O Cloud Logging pode ter uids e nomes nos logs; ele expira sozinho pela retenção do projeto.

## 400 de cada material de mundo para todos (Correio do Mestre)
No Painel do Mestre, em **Jogadores → Correio** (só o Dono):
1. Marque **Para todos**.
2. Título (ex.: `Materiais de mundo`) e texto (ex.: `400 de cada material, enquanto a Campanha não abre.`).
3. No campo **Materiais (código)**, toque em **Preencher: 400 de cada material de mundo** (ou cole o código abaixo) e em **Mandar para todos**.
4. Cada jogador resgata o presente no Correio dele. A mensagem vale 30 dias e **também aparece para quem criar a conta nesse período**.

Custo: **1 gravação** para a mensagem; cada jogador gasta 1 gravação no próprio personagem ao resgatar. Pode mandar antes ou depois da limpeza: o `correioGeral` não é apagado.

Código (35 materiais de mundo, 400 de cada):
```json
{
  "mundo-osso-bruto": 400,
  "mundo-presa-gasta": 400,
  "mundo-minerio-de-ferro-bruto": 400,
  "mundo-minerio-de-cobre": 400,
  "mundo-fibra-silvestre": 400,
  "mundo-couro-grosseiro": 400,
  "mundo-garra-rachada": 400,
  "mundo-osso-reforcado": 400,
  "mundo-presa-dentada": 400,
  "mundo-minerio-de-prata": 400,
  "mundo-cristal-bruto": 400,
  "mundo-raiz-medicinal": 400,
  "mundo-glandula-venenosa": 400,
  "mundo-escama-resistente": 400,
  "mundo-osso-ancestral": 400,
  "mundo-presa-draconica": 400,
  "mundo-minerio-de-sangue": 400,
  "mundo-cristal-arcano": 400,
  "mundo-raiz-ancestral": 400,
  "mundo-coracao-de-serpe": 400,
  "mundo-nucleo-elemental": 400,
  "mundo-osso-de-colosso": 400,
  "mundo-chifre-de-dragao": 400,
  "mundo-minerio-de-mithril": 400,
  "mundo-geodo-primordial": 400,
  "mundo-flor-celestial": 400,
  "mundo-coracao-de-dragao": 400,
  "mundo-gema-de-monstro": 400,
  "mundo-osso-de-dragao-anciao": 400,
  "mundo-chifre-do-soberano": 400,
  "mundo-minerio-estelar": 400,
  "mundo-cristal-do-vazio": 400,
  "mundo-raiz-da-arvore-mundial": 400,
  "mundo-gema-de-dragao": 400,
  "mundo-essencia-primordial": 400
}
```
