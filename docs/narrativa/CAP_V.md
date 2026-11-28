# CAPÍTULO V — O SILÊNCIO CHAMA

**Status:** **[PROPOSTA]** para aprovação. Na árvore, tudo o que é novo entra como **Planejado**. Valores de relacionamento (0 a 50) são ocultos ao jogador e são propostas.

---

## 1. Conceito

A crise deixa de ser uma ideia. Na **Rota A**, ela tem o corpo de um amigo: Edran, amarrado a uma árvore, ouvindo um chamado que não é o nome dele. Na **Rota B**, ela tem o tamanho de um lugar: a Caverna Muda, onde algo foi impedido de nascer. As duas rotas descobrem a mesma coisa por caminhos opostos: **a Chamada chama sem nome, e quem é chamado pelo nome responde ao nome.**

## 2. Função narrativa

- Mostra a doença e a causa, cada rota de um lado.
- Aplica a resolução do Conselho (R1, R2 ou R3) no campo.
- Traz a **dobradiça 2** de cada rota: o tempo ou o amigo (A); o que fazer com o que se descobriu (B).
- Cumpre a regra do Kaldrun: **primeiro contato** com o ancião antes da dobradiça 3 (na Rota B; na Rota A, no Cap. VI).
- Planta o princípio da cura (a voz de quem conhece o doente) e liga-o ao tema do Guardião sem nome.
- Prepara a convergência das rotas no Capítulo VI.

## 3. Personagens

| Personagem | Papel |
|---|---|
| Edran | A: o doente. B: o mestre que, pela primeira vez, chama alguém pelo nome |
| Rhys Ashcombe | A: o mensageiro que traz o Guardião de volta. B: o jovem que ouve a Chamada |
| Wren Hawkins | A: cena 2 e a promessa de trazer Edran de volta |
| Halric Stroud | A: chefe da Estação, preocupado |
| Aurelian Vael | A: o Curador que falha e escolhe ajudar |
| Nerys Aldermere, Bram Ostrel | A: a cura. B: continuam em Namar |
| Corvin Hask | B: o caçador que encontra o Guardião |
| Kaldrun | B: o ancião na boca da caverna |
| Godric, Vesemir | A: voltam com o mandato. B: voltam no Cap. VI |

---

## 4. Desenvolvimento

### Parte A: Rota A, O retorno ao Sul

**1. O mandato e a estrada de volta.** O cavaleiro que trouxe a carta é **Rhys**, 19 anos, da Estação. Ele cavalga de volta com o grupo e, nervoso, conta como Edran o treinou e que ele falou de um zumbido. O mandato muda a viagem conforme a resolução:
 - **R1:** a companhia de caça imperial de Corvin Hask segue à frente, com um clérigo e um **turíbulo de brasas** que bendiz a estrada. Brenna manda um olhar duro.
 - **R2:** a comissão viaja com o grupo: um jovem mago de Orlan, dois observadores imperiais (um oficial e um clérigo) e o selo de Tamsyn. A viagem é lenta, cheia de formalidades.
 - **R3:** uma coluna do Sul sob um tenente de Brenna, com batedores imperiais nas bordas. A sensação de estar sendo vigiado.

**2. A volta à Estação.** **Halric Stroud** relata: Edran saiu há quatro dias, com a corda e a água, e deixou um bilhete: "Se eu não voltar, não vão atrás sozinhos." No pátio, o grupo imperial (R1), a comissão (R2) ou a coluna (R3) se instala. **Wren**, cena 2: ela viu Edran partir ao amanhecer ("ele disse que ia ouvir mais de perto") e pergunta se o Guardião vai trazê-lo. Se há `wren_notebook`, ela entrega a página que mostra a direção do silêncio, que coincide com o caminho de Edran e poupa um dia de busca. **Escolha (promessa):** prometer trazê-lo (Wren +3, flag `promise_wren`); dizer que vai tentar (Wren +2); não prometer (Wren 0). Em R1, Wren desenha "o homem com um sol de brasa": a imagem do turíbulo.

**3. O rastro de Edran.** O Guardião segue os sinais que o próprio Edran lhe ensinou: cortes de faca na casca a cada cem passos, depois irregulares. Edran está **amarrado a um carvalho com a própria corda**, sentado, lúcido por intervalos: "Eu me amarrei. Foi o que deu pra fazer." Ele descreve o som como "alguém chamando meu nome do outro lado de uma parede, mas não é o meu nome". Sob as costelas, um calor que se move. A recepção depende do que ficou da despedida:
 - Se o Guardião prometeu voltar: "Você disse que voltaria. Eu não acreditei. Estou feliz de estar errado."
 - Se foi frio: "Não precisava ter vindo", e depois, baixo, "obrigado".
 - Se reconheceu o trabalho dos dois: "Eu sabia que você ia ler os sinais."

**4. O Curador.** Em Salgueira, a caravana de **Aurelian Vael** trata febres sem causa em duas dúzias de aldeões. Ele examina Edran com as mãos, ervas e orações: nada. Edran: "Reza mais baixo, estou tentando ouvir a outra voz." Aurelian fica à cabeceira a noite toda, **sem dormir**, e ao amanhecer chama o Guardião à parte: "Já vi isto em três aldeias. Os que rezam não melhoram. Há uma mulher em Namar. A Igreja não a aprova. Eu nunca lhe disse isso." **Escolha:** agradecer e guardar o segredo (Aurelian +3, flag `aurelian_secret`); perguntar por que a Igreja não cura isto (Aurelian +2: "Porque eu não sei. E não sei dizer isso aos meus"); insistir em levar Edran ao hospital da Igreja (Aurelian +1, Edran −2; a Igreja registra o caso, flag `church_knows_host`).

**5. Dobradiça 2A: o tempo ou o amigo.** Edran piora a cada dia. O mandato tem relógio (R1: os caçadores começam sem eles em três dias; R2: dia 9 dos 60; R3: o prazo de 30 dias aperta). **Escolha importante:**
 - **Ir a Namar com Edran** (Godric e Vesemir seguem com o mandato). Edran +3; se havia promessa, é cumprida. Custa cerca de quatro dias do mandato.
 - **Seguir com o mandato; Halric e Rhys levam Edran.** Godric +2. Edran −3 e a promessa, se houver, se quebra (flag `promise_broken_edran`). Nerys apenas retarda; a cura exige o Guardião antes do Ato IV.
 - **Todos vão a Namar.** Vesemir +3, Godric +2, flag `saber_early`. Custa cerca de seis dias; os outros chegam à serra sem eles.

**6. Namar** (se foram). Nythara, os Charcos, Bram e Nerys. Nerys examina Edran: "A Chamada. Os que ficam dentro, chamamos de Visitante." As lanternas **retardam**. Para curar, são necessárias **três coisas:** a **flor do fundo do lago** (Namar), a **resina do casulo** (Caverna Muda) e **a voz de quem conhece o doente**: "Quem é chamado por um nome responde ao nome." Bram confirma o pedido de silêncio de Nythara: "O véu vê o que a lanterna não vê." Nerys chama o Guardião de **"Pé-Leve"**.

**7. Fim: "Qual é o seu nome?"** Na madrugada, Edran, lúcido, pergunta o nome do Guardião: "Eu nunca perguntei. Nunca me pareceu da minha conta." Ele não responde. Edran: "Então vou te dar um. Não gosto de ficar chamando de rapaz." Chama-o de **"Novato"** (relacionamento < 25) ou **"Parceiro"** (≥ 25). Edran nota que, quando fala o nome, o zumbido recua.

### Parte B: Rota B, A Caverna Muda

**1. A subida para a serra.** Deixam Namar ao amanhecer, seguindo o caminho do homem que caiu (se o Guardião o seguiu) ou a descrição de Nerys. O campo já não está vazio:
 - **R1:** a companhia de **Corvin Hask**, caçadores oficiais com um clérigo e um turíbulo. Corvin divide o fogo e pergunta: "Sabe onde fica a toca?" O Guardião pode mentir, calar ou dizer a verdade (fixa o flag `corvin_met`).
 - **R2:** um batedor da comissão, jovem mago de Orlan, com um bilhete de Nocthera.
 - **R3:** soldados do Sul sob um tenente de Brenna e um observador imperial.

**2. Rhys alcança os dois.** **Rhys**, enviado por Halric com mantimentos e uma carta, encontra o Guardião e Edran. Ele os idolatra e fala demais; Edran o chama de moleque e o ensina a ler a trilha. Cenas pequenas: Edran deixa Rhys dormir mais; o Guardião divide a vigília.

**3. A Caverna Muda.** Ao anoitecer, o silêncio total: nenhum inseto, nenhum pássaro (se há `wren_notebook`, o Guardião reconhece a direção do silêncio). Carcaças ressecadas. No fundo, o **casulo aberto**: uma membrana do tamanho de uma casa, rasgada **de fora para dentro**, bordas chamuscadas, resina negra, garras no chão do tamanho de um homem. As botas de Ansel passam pela boca da caverna sem entrar. Edran: "Alguém abriu isto de fora. Quem nasceu aqui não terminou." Rhys: "A toca do dragão!" **Escolha importante, o que o casulo significa:**
 - "É a toca de um dragão." H+2; flag `cocoon_lair`; Rhys orgulhoso; Edran franze a testa.
 - "Alguma coisa foi impedida de nascer." C+2; flag `cocoon_prevented`; Edran +2.
 - "Não sabemos: colher amostras e voltar." Neutro; flag `cocoon_samples`: o Guardião colhe a **resina** (ingrediente da cura); Vesemir +1 mais tarde.

**4. Kaldrun na boca da caverna.** Um vento quente. **Kaldrun**, o ancião, coloca-se entre eles e o fundo. Velho, cicatrizes de fogo no peito, ofegante. Ele **não ataca**: bloqueia. Rhys saca a lâmina; Edran congela. **Escolha importante:**
 - **Ficar imóvel e deter Rhys.** `kaldrun_bond` +2; Rhys −1 (depois agradece); Edran +1.
 - **Recuar devagar, todos juntos.** `kaldrun_bond` +1; Edran +1.
 - **Aproximar-se de mãos abertas.** `kaldrun_bond` +3; Edran −1 (imprudência); Rhys apavorado. Kaldrun respira fundo e deixa passar um instante.
 Ele os deixa ir. Edran: "O mais perto que já estive de morrer e não morri." **Regra cumprida:** contato antes da dobradiça 3.

**5. Dobradiça 2B: o que fazer com o que se descobriu.** No acampamento, com a caverna às costas, o grupo decide a quem contar o local. **Escolha importante:**
 - **Reportar o local e a leitura ao comando** (caçadores em R1, comissão em R2, tenente em R3). Godric +2. Em R1, os caçadores vão à caverna no Cap. VI, o que ameaça Kaldrun.
 - **Guardar o segredo.** Godric −2 quando descobrir. Os caçadores procuram às cegas e o encontram mais tarde.
 - **Contar só a Godric e Vesemir**, que decidem. Godric reportaria (ele não falsifica dados), com atraso. Godric +1.

**6. A segunda Chamada.** À noite, **Rhys**, que tocou a casca do casulo, se levanta e caminha para a caverna com os olhos vazios. Edran acorda. Segue-se o que o Guardião aprendeu em Namar:
 - Se **segurou** o pescador: seguram Rhys, que se debate; estágio 2.
 - Se **seguiu** o pescador: sabem o destino, mas não a cura; estágio 3, mais perto da boca.
 - Se **chamou Bram**: lembram as lanternas, acendem uma, e Rhys desacelera; estágio 1.
 O momento: Edran grita **"Rhys!"** e o rapaz **para**. Edran, que tem medo de criar laços, repete o nome a noite toda. O Guardião ouve. (A Rota B descobre o princípio pela experiência.)

**7. Fim.** Ao amanhecer, Rhys está lúcido e febril. Edran: "Vamos a Namar. Agora." Fumaça de fogueiras de caça no horizonte, se o local foi reportado. Fim.

---

## 5. Dimensão emocional e filosófica

- **O jogador deve sentir:** o medo de perder alguém que se aprendeu a respeitar (A); o silêncio de um lugar que deveria ter vida, e a calma de um animal enorme que não ataca (B).
- **Questões:** *quem é chamado pelo nome responde ao nome* e *o que resta de uma pessoa quando é chamada por um som sem nome?* O Guardião sem nome é, ele mesmo, um chamado sem nome. O capítulo prepara o tema do **nome como cura**.
- **Edran:** na A, é o objeto do cuidado; na B, é quem aprende a cuidar. O medo dele (criar laços e enterrar pessoas) é testado em ambas.

## 6. Efeitos em chaves

| Escolha | Efeito |
|---|---|
| Promessa a Wren | `promise_wren`; pesa na morte dela (Ato IV) |
| Aurelian | `aurelian_secret`, `church_knows_host` |
| Dobradiça 2A | Tempo do mandato; promessa a Edran; `saber_early` |
| O casulo | `cocoon_lair`, `cocoon_prevented`, `cocoon_samples` (resina) |
| Kaldrun | `kaldrun_bond` (0 a 3), usado na dobradiça 3 |
| Dobradiça 2B | Quando os caçadores chegam à caverna |
| Rhys | `rhys_infected`; estágio 1 a 3 |

## 7. Continuidade e ganchos para o Capítulo VI

- **Fixos:** Edran, no A, pode morrer no Ato IV sem tratamento; Wren morre no IV.
- **Cura (proposta):** três ingredientes: flor do lago (Namar), resina do casulo (Caverna Muda), voz de quem conhece o doente. Em A cura-se Edran; em B, **Rhys**.
- **Convergência:** no Cap. VI as rotas se reúnem no acampamento aos pés da serra (Godric e Vesemir, o mandato, os caçadores, Kaldrun).
- **Pistas pequenas:** Aurelian que nunca dorme (falso positivo); os turíbulos de brasa (prefiguram o fogo do Ato IV); as botas de Ansel; o pedido de silêncio de Nythara.

## 8. Avaliação crítica

**Pontos fortes.** O paralelo entre as duas rotas (Edran doente / Rhys doente) dá peso simétrico. O princípio do nome nasce de uma cena de ação, não de uma explicação. A regra do Kaldrun é cumprida.

**Riscos e correções.**
- **Dois doentes pode parecer repetição.** Mitigação: em A o doente é um amigo que o jogador já amou; em B é alguém que o jogador acabou de conhecer. O impacto é diferente.
- **Rhys infectado é uma proposta nova** e muda o destino dele. Pede aprovação.
- **O Curador pode parecer só "o bom da Igreja".** Mitigação: ele **falha**, e o jogador sabe que há algo que ele não diz.
- **A cura em três ingredientes pode virar lista de tarefas.** Mitigação: cada ingrediente é uma missão com personagem e custo próprio (Capítulos VI a IX).
- **Excesso de nomes novos.** Mitigação: reutilizamos Nerys, Bram, Rhys, Wren e Halric, sem criar personagens além do planejado.

## 9. Para sua aprovação

1. Título "O Silêncio Chama" serve?
2. Estrutura e as escolhas das duas partes estão boas?
3. **Rhys infectado na Rota B**: aprova? (Alternativa: o infectado em B seria outro, ou ninguém.)
4. O princípio **"quem é chamado pelo nome responde ao nome"** e a cura em três ingredientes (flor do lago, resina do casulo, voz de quem conhece o doente)?
5. Edran chamar o Guardião de "Novato" ou "Parceiro" conforme o relacionamento serve?
