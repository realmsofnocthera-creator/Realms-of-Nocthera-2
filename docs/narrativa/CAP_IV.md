# CAPÍTULO IV — CONSELHO DAS COROAS (versão completa)

**Status:** **[PROPOSTA]** para aprovação. Na árvore, tudo o que é novo entrou como **Planejado**; o que já era canônico mantém o status. Depois da sua aprovação, os nós passam a **Confirmado**.

**Legenda dos números:** os valores de relacionamento (0 a 50) são ocultos ao jogador e são **propostas**. **H** = peso a favor da caça; **C** = peso a favor da investigação e da cautela (ver seção 6).

---

## 1. Conceito

O capítulo em que a crise ecológica vira política. O Sul convoca os poderes de Vhaldoria para pedir ajuda, e o Império vê nisso uma porta aberta. O Guardião, que nasceu querendo não ser visto, é posto diante de uma sala que exige que ele seja ouvido (Rota A), ou escolhe estar longe de onde se decide o mundo (Rota B). A primeira escolha da campanha não é entre bem e mal: é entre **saber como se decide** e **saber do que se morre**.

## 2. Função narrativa

- Fecha a abertura (Ato I) e inaugura o Ato II com a primeira grande divisão de rotas.
- Apresenta o mapa político: Império, Sul, Nocthera, Nythara, Ilhas.
- Faz a crise ecológica ganhar dimensão política, com um pretexto jurídico que o Império usará na invasão (ponto fixo do Ato IV).
- Faz a Rota A conhecer a **política** e a Rota B conhecer a **doença**.
- Planta pistas pequenas do segredo da Igreja e prepara as três cenas de Wren antes de sua morte.

## 3. Personagens

| Personagem | Papel no capítulo |
|---|---|
| Godric, Vesemir, Edran | Núcleo. Cada um quer uma coisa diferente do relatório |
| Wren Hawkins | Primeira cena (comum). Segunda na Rota B |
| Alaric Veyrond | Anfitrião; o rei que decide |
| Severan Dravik, Lucan Ardelis | O pedido de "ajuda" imperial e o argumento religioso |
| Evelyne Duskryn, Orlan Mereth | Nocthera: cautela e informação |
| Lysenne Duskryn, Caelith Ravenor | A fuga que não quer a sala; dá o primeiro nome ao Guardião |
| Ingvar Skarholt | Ilhas: devoto, a favor da caça |
| Tamsyn Ulwen | Nythara: "já vimos isto" |
| Osric, Brenna, Ilaria | A corte do Sul, dividida |
| Nerys Aldermere, Bram Ostrel | Rota B: o povo de Namar e a Chamada |

---

## 4. Desenvolvimento

### Parte 1 — Comum (Estação Ecológica de Velária)

1. **Convocação e relatório** **[existente]**. Chega um mensageiro de Eldervar: o rei Alaric, do Sul, convoca o Conselho das Coroas. Godric redige o relatório.
2. **Decisão de ampliar a investigação** **[existente]**. Vesemir quer aprofundar; Edran quer voltar aos locais não examinados.
3. **A menina e a cria preservada** *(novo)*. Na véspera da partida, o Guardião encontra **Wren Hawkins** (13 anos) na sala onde o corpo ressecado da cria está preservado. Ela entrou escondida e o desenha. Vesemir entra, fica rígido e pede que ela saia, sem conseguir olhá-la. Wren sussurra que os pássaros pararam de cantar semanas antes de qualquer adulto notar, e mostra as datas no caderno. **Escolha:** deixá-la terminar (Wren +2); perguntar sobre o caderno (Wren +3, flag `wren_notebook`: as datas e a direção do silêncio ajudam a achar a caverna); levá-la à mãe (Maren +1, Wren 0, Vesemir +1). *Primeira de pelo menos três cenas.*
4. **Fechando o relatório** *(novo)*. Godric decide como o relatório descreve a criatura. **Escolha importante:**
 - **Criatura desconhecida; pedir tempo.** Godric +2. **C+1**.
 - **Provavelmente um dragão.** Vesemir +2. **H+2**.
 - **Dar peso às vítimas** (a cria, os animais mortos sem ferimentos). Edran +2. **C+2**.
5. **A escolha no acampamento** **[existente]**: Rota A (Godric e Vesemir) ou Rota B (Edran).

### Parte 2 — Rota A: Eldervar

6. **Despedida de Edran**, **Edran investiga sozinho**, **a enfermidade e a cura** **[existente]**.
7. **Partida, estrada e conversa privada com Vesemir** **[existente]** (+2, +3, +1).
8. **Chegada a Eldervar e a entrada na capital** **[existente]**. Escolha de perguntas (Godric +1, Vesemir +1, ou apenas observar).
9. **Os anfitriões do Sul** *(novo)*. **Osric Delaval** recebe-os com cortesia treinada; **Brenna Rathmore** é direta ("quantos homens essa coisa devora?"); **Ilaria Veyrond** quer saber como era a cria. O Sul explica por que chamou o Conselho: não pode carregar a crise sozinho, e não esperava que o Império viesse tão pronto. A corte está dividida: Brenna quer fortificar, Osric quer negociar. Relacionamentos iniciais: Brenna 12, Osric 10, Ilaria 10.
10. **Encontro com Evelyne** **[existente, detalhado]**. Em um terraço, Evelyne já conhece Godric e Vesemir e quer ver "o guarda que carregou a criatura". Ela pergunta o nome dele. O Guardião responde "Guardião". Ela: "Isso é um ofício. Não é um nome." Passa a chamá-lo de **"o Sem-Nome"**. **Escolha:** apresentar-se formalmente (Evelyne +2); reservado, deixando Godric explicar (Evelyne +1); curioso sobre Nocthera (Evelyne +3, mas **Lucan Ardelis nota** a simpatia pela magia: flag `lucan_notice`).
11. **Preparação** **[existente]**. Ajudar Godric (Godric +2, flag `godric_support`: **C+1**); conversar com Vesemir (Vesemir +2, ele confessa o medo de que o Conselho queira sangue); descansar.
12. **O Conselho das Coroas** *(expandido)*, no Salão das Coroas.
 - **Abertura.** Alaric: "Chamei esta mesa porque o Sul não carrega sozinho o que vem do Sul." Severan, com **Lucan Ardelis** (Arcebispo, o Diplomata) ao ombro; **Ingvar Skarholt** rígido; **Tamsyn Ulwen**, encapuzada, fala "nós"; Evelyne com Orlan.
 - **A apresentação.** Godric lê os fatos; Vesemir mostra as amostras. Ingvar pergunta se era um dragão. Godric: "Não sabemos."
 - **O testemunho do Guardião** **(escolha importante)**. Severan: "O guarda que a carregou. Fale." Ser ouvido em público é ser conhecido, o oposto do que ele quer:
 - **Humanizar:** "Estava pedindo ajuda. A mãe morreu protegendo-a." **C+2**, Vesemir +2.
 - **Dados frios:** "Morreu em uma noite e o corpo secou." Godric +2. Sem efeito em H/C.
 - **Alertar:** "Seja o que for, matou sem tocar. Pode fazer o mesmo conosco." **H+2**, Vesemir −1, Severan +1.
 - **Recusar:** "Godric fala por mim." Godric +1. O Guardião continua desconhecido, mas Severan nota a esquiva.
 - **As posições.** Império e Ilhas: caçar. Severan: "Um mundo dividido não se protege." Evelyne: "Antes de caçar, saber; quem mata o que não entende raramente sai ganhando." Tamsyn: "Nythara já viu o que o guarda descreve. Nythara não dirá mais." (pista; Evelyne olha para ela). Alaric, calado.
 - **A proposta imperial: o Auxílio de Caça.** Severan formaliza: caçadores e tropas imperiais podem atravessar as fronteiras do Sul por 90 dias, com clérigos para bendizer a caçada. Alaric pede recesso até a manhã.
13. **Depois da sessão** *(novo)*.
 - **O jardim.** Fugindo da sala, o Guardião encontra **Lysenne Duskryn** sentada num muro; Caelith está numa árvore, imóvel. Lysenne: "Você também fugiu da sala?" **Escolha:** honesto ("Precisava de ar") Lysenne +2; revelador ("Eu não fujo. Só não quero ser visto") Lysenne +3; silêncio, Lysenne +1. Em todas, ela o chama de **"Quieto"**, o primeiro nome que alguém lhe dá por conta própria. Ela solta uma frase torta sobre velhos escolhendo a hora de quem morre.
 - **Orlan.** O arquimago fala com o Guardião em passagem: "Não gosto de quem escreve a história de quem não esteve lá. Eu estive." Olha para Lucan. Pista pequena, sem explicação.
 - **A audiência privada com Alaric** **(escolha importante)**. À noite, o rei chama "o rapaz de Velária": "Se fosse a sua casa, abriria a porta?" **Escolha:** "Aceite a ajuda, eles têm homens e nós não" (**H+2**, Osric aprova, Brenna reprova); "Recuse. Quem entra em casa alheia depois não sai" (**C+2**, Alaric +2); "Não sei. Mas decida olhando para quem vai pagar" (Alaric +3, sem efeito em H/C; respeito pela honestidade).
 - **A resolução do Conselho** (ver seção 6).
14. **Fim: Carta de Velária.** Ao amanhecer, com o mandato em mãos, chega um cavaleiro de **Halric Stroud**: Edran saiu para o norte há quatro dias e não voltou. Disse que ouvia "um zumbido nas árvores" que ninguém mais ouvia. Se o Guardião prometeu voltar, a carta inclui: "Ele disse que você viria." Lysenne, de longe, acena. Fim do capítulo.

### Parte 3 — Rota B: o campo

6. **Godric e Vesemir partem sem o Guardião** *(novo)*. Despedida no acampamento. Godric: "Volte com fatos." Vesemir deixa seu caderno de campo. **Escolha:** pedir a Godric que escreva à esposa (flag `godric_letter`; Godric reage com desconforto, mas anota); pedir que diga a verdade ao Conselho, mesmo que doa (Godric +2, **C+1**); não pedir nada.
7. **Salgueira** *(novo)*. O caminho passa pelo povoado. **Maren Hawkins** oferece pão e pergunta se Godric mandou algo. Edran ensina **Wren** a rastrear: segunda cena dela. **Escolha:** entregar a mensagem de Godric (se houver `godric_letter`, Maren +2); contar só o que ele disse (Maren +1); calar (Maren 0). A resposta muda quanto a partida dela dói depois.
8. **Os locais não examinados** *(novo)*. Um leito seco; um bosque vazio de animais; e uma trilha de herbívoros todos na mesma direção. Edran: "Isso não é fuga, é procissão." Num trecho, pegadas de botas em linha reta, sem pressa e sem desvio. Edran: "É o pesquisador." (**Ansel Pryce**) Ele "andou como quem foi chamado."
9. **A noite: Edran e o terreno** *(novo)*. Perto do fogo, Edran mostra o mapa dobrado do terreno que quer comprar, perto de Trigalva. Ele não pede nada; o Guardião pode perguntar ou não. É a primeira vez que Edran fala de um futuro. (Edran +2 se o Guardião pergunta.)
10. **A fronteira de Namar** *(novo)*. As pegadas de Ansel se juntam a outras, de camponeses, nos Charcos de Namar, território de **Nythara**. Vigias param os dois. **Bram Ostrel**, o Guardião das Lanternas, e **Nerys Aldermere**, curandeira, reconhecem a bota: "Esse também andou."
11. **A Chamada** *(novo)*. À noite, um pescador se levanta do leito e caminha para o norte com os olhos vazios. Bram acende as lanternas do lago: algumas vezes a luz o faz parar. **Escolha importante:**
 - **Segurá-lo à força.** Ele vive esta noite; algo se move sob a pele dele (Nerys sente). Nerys +3. Edran +2.
 - **Segui-lo sem interferir.** Eles veem a fila de caminhantes e o homem cair ao pé de uma serra, seco, como a cria. Descobrem o caminho (a **Caverna Muda**, nome local da Caverna do Casulo). Nerys −2, Edran endurece (flag `edran_hardened`).
 - **Entregar a Bram.** O homem para junto das lanternas e vive, mas fica doente. Bram +2.
12. **O que Namar sabe** *(novo)*. Há meses a Chamada leva gente do povoado. Nythara pediu **silêncio** ("o véu vê o que a lanterna não vê") e Namar obedeceu, o que liga a frase de Tamsyn no Conselho. Nerys descreve "um bicho que mora dentro"; ao ouvir da cria que secou, entende. Ela pede amostras de Vesemir.
13. **Notícias do Conselho** *(novo)*. Chegam cartas de Godric (dados) e de Vesemir (o que foi sentido). A resolução (R1, R2 ou R3) é decidida sem o Guardião, por **flags** (ver seção 6): o relatório, a despedida, as relações. Em B, a base é mais favorável à caça, pois há menos quem defenda a cautela.
14. **Fim: o caminho da Caverna Muda.** Nerys indica o caminho até a serra. Edran: "Vamos de manhã." Fim do capítulo.

---

## 5. Dimensão emocional e filosófica

- **O jogador deve sentir:** o peso de ser olhado (testemunho), a pressa de uma sala em que tudo já está decidido, e a impotência de quem vê o mundo mudar sem poder impedir. Na Rota B, a intimidade e o horror de ver gente caminhar até morrer.
- **Questões:** *uma decisão necessária pode continuar sendo moralmente errada?* (aceitar a ajuda); *é possível não deixar rastro?* (o Guardião ser forçado a falar); *quanto de uma vida cabe no que decidimos por ela?* (a Chamada).
- **Rotas:** A mostra como se decide; B mostra por que a decisão importa.

## 6. A regra do Conselho (propostas, valores ocultos)

Soma H e C a partir de: relatório (C+1, H+2, ou C+2), testemunho (C+2, 0, H+2, 0), apoio de Godric (C+1), audiência com Alaric (H+2, C+2, ou 0). Na Rota B, base **H+1** e só contam o relatório, a despedida e as relações.

- **H − C ≥ 2 → R1.** **O Auxílio de Caça Imperial.** O Conselho autoriza caçadores e tropas do Império, com clérigos, por 90 dias. Pretexto jurídico sólido para a invasão do Ato IV. Brenna furiosa; Osric satisfeito; Evelyne se afasta; Aldric posiciona batedores. A dobradiça 3 se inclina para a morte do ancião por caçadores imperiais (Corvin Hask).
- **C − H ≥ 2 → R2.** **A Comissão de Investigação.** Comissão conjunta (Sul, Nocthera, Nythara como observadora, e dois imperiais) por 60 dias; o grupo recebe cartas de mandato e acesso a Namar e a Orlan. Severan fica ressentido e buscará outro pretexto. Nocthera se aproxima do Sul. Caçadores particulares ainda entram.
- **Caso contrário → R3.** **A Caça sob Comando do Sul.** Os caçadores entram sob o comando de Brenna e com prazo de 30 dias. O Sul se prepara; espiões imperiais circulam. Tensão máxima.

**A invasão do Ato IV é ponto fixo.** O que a resolução muda é: o pretexto, o grau de preparo do Sul e quem está a seu lado.

## 7. Continuidade

- **Fixo:** a invasão do Sul; Wren morre (Ato IV); Edran contrai a enfermidade na Rota A.
- **Wren:** cena 1 (comum); cena 2 em Salgueira na B, ou no retorno (Cap. VI) na A; cena 3 (promessa) nos Caps. VI a VIII.
- **Ganchos para o Cap. V:** na A, o retorno ao Sul com o mandato e a notícia de Edran; na B, o caminho da Caverna Muda e a presença de caçadores no campo.
- **Pistas pequenas:** Orlan e a história escrita por quem não esteve lá; Tamsyn e o silêncio de Nythara; Lucan não mente, só omite; Bram e o pedido de silêncio.

## 8. Avaliação crítica

**Pontos fortes.** O Conselho é político e íntimo ao mesmo tempo (o testemunho e a pergunta do rei). A Rota B tem uma cena de impacto equivalente (a Chamada). As escolhas pesam em dimensões diferentes (política, relação, informação).

**Riscos e correções.**
- **O Conselho pode virar cena de diálogo longa.** Mitigação: a sessão é curta, com poses e gestos; o jogador atua só no testemunho.
- **A Rota A pode ficar mais rica que a B.** Mitigação: a B tem Namar, a Chamada e a trilha de Ansel; manter a duração parecida.
- **A resolução pode parecer só "sabor".** Mitigação: no Cap. V os caçadores já estão (ou não) no campo, e os mandatos existem (ou não).
- **O jogador pode sentir que não impede a invasão.** Mitigação: deixar claro, com pistas (a mesa de mapas de Severan, Zofia), que ela é inevitável, e que o que muda é o pretexto, o preparo e os aliados.
- **Wren como "criança condenada".** Mitigação: ela age (o caderno é pista real) e tem desejos próprios.

## 9. Para sua aprovação

1. Aprova a estrutura (partes 1 a 3) e as escolhas?
2. Aprova a regra do Conselho (H e C, R1 a R3)?
3. "Caverna Muda" como nome local da Caverna do Casulo? "Chamada" para o chamado do dragão?
4. Lysenne chama o Guardião de "Quieto" em todas as opções, com tons diferentes. Serve?
5. Quer que o segredo da Igreja entre na árvore? **Não o coloquei.**
