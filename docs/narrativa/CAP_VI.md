# CAPÍTULO VI — A NOITE DOS NOMES

**Fecha o Ato II.** **Status:** **[PROPOSTA]** para aprovação. Na árvore, tudo o que é novo entra como **Planejado**. Valores de relacionamento (0 a 50) são ocultos e são propostas.

---

## 1. Conceito

As duas rotas se encontram num acampamento aos pés da serra, onde se juntam a política (caçadores, comissão ou soldados), a doença e a lenda. Numa noite, a Chamada se intensifica: os doentes se levantam e caminham para a caverna. A única coisa que os detém é um nome. Mas **quem ninguém chama pelo nome, ninguém segura.** O capítulo termina com uma conclusão errada, porém sólida: "o dragão chama gente."

## 2. Função narrativa

- **Convergência com cicatriz:** as rotas chegam ao mesmo lugar com companheiros, informações e feridas diferentes.
- **Paga escolhas:** Aurelian, Wren, Kaldrun, a dobradiça 2, a resolução do Conselho.
- **Dá à Rota A o primeiro contato com Kaldrun** (regra cumprida antes da dobradiça 3).
- **Terceira cena de Wren** (a promessa).
- **Põe o princípio do nome em ação**, diante de testemunhas.
- **Planta a falsa prova** que alimentará a dobradiça 3: as pessoas que são chamadas vão para a caverna onde Kaldrun está. O verdadeiro responsável está mais fundo.

## 3. Personagens

| Personagem | Papel |
|---|---|
| Godric, Vesemir | Reunião; a ferida; a pergunta sobre a caverna |
| Edran (A) / Rhys (B) | O doente; quem é chamado pelo nome |
| Nerys Aldermere | Cura e riscos com o clérigo |
| Corvin Hask | R1: caçador; R2/R3: tolerado nas bordas |
| Irmão Teodor Wick | Clérigo do acampamento (secundário) |
| Wren Hawkins | Cena 3: a promessa |
| Tomm Brack, Pell | Batedores locais; um deles não tem quem o chame |
| Kaldrun | Amanhecer na boca da caverna |
| Vesemir | Testemunha do contato (A) |

---

## 4. Desenvolvimento

### Parte A: Rota A, A serra

**1. A viagem à serra.** Conforme a dobradiça 2A:
 - **Ir a Namar com Edran:** o Guardião, Edran e Nerys (com as lanternas, pois ela precisa da resina da caverna) sobem juntos.
 - **Seguir com o mandato:** o Guardião sobe com Godric e Vesemir; Edran chega depois, com Halric, Rhys e Nerys.
 - **Todos a Namar:** sobem todos, com atraso, e encontram os outros já instalados.

**2. Godric e a ferida.** Godric examina o calor que se move sob as costelas de Edran e diz, devagar, a palavra que evita: **Fragmento do Caos**. Se o relacionamento com o Guardião é ≥ 20, conta que o pai, Loric, arrancou os próprios olhos "para não ver mais" (Godric +2). Se não, fecha-se: "Não é um assunto para esta tenda."

### Parte B: Rota B, A volta a Namar

**1. Namar.** Nerys examina Rhys e confirma: a Chamada. Explica as **três coisas** da cura e o princípio: "Quem é chamado por um nome responde ao nome." A voz tem de ser de quem conhece o doente. Edran: "Eu não sou nada dele." Nerys: "Você gritou o nome dele a noite toda."

**2. A volta à serra** com Nerys e as lanternas, em marcha lenta; Rhys ardendo em febre.

**3. O reencontro com Godric e Vesemir**, conforme a dobradiça 2B:
 - **Reportado:** Godric: "Você fez o que eu faria." Os caçadores já estão a caminho.
 - **Segredo:** Godric descobre pela comparação das notas e o confronta (Godric −2): "Os fatos não são minha propriedade, nem sua." Depois reporta por conta própria.
 - **Contado a Godric e Vesemir:** Godric agradece a confiança e reporta, com atraso.

### Parte C: Comum, Os caminhos se encontram

**1. O acampamento aos pés da serra.** Barracas, fogueiras e, ao fundo, a serra sem um pássaro.
 - **R1:** a companhia de Corvin Hask, com turíbulos de brasa; os clérigos bendizem o acampamento.
 - **R2:** a comissão (mago de Orlan, observadores imperiais, o selo de Tamsyn); Corvin está nas bordas, contratado em particular, sem poder entrar na caverna.
 - **R3:** a coluna do Sul sob o tenente de Brenna; Corvin e batedores imperiais sob ordens dele.

**2. O clérigo e a curandeira.** O **irmão Teodor Wick**, jovem clérigo, vê Nerys e a chama de "bruxa do brejo". Cassian está longe, mas o relatório de Teodor chegaria a ele. **Escolha importante:**
 - **Interceder: "Ela cura, e eu respondo por ela."** Nerys +2; `camp_trust` +1 (o acampamento respeita quem salva gente); Teodor reporta o caso (`church_knows_nerys`).
 - **Deixar Godric argumentar com fatos.** Nerys +1; neutro.
 - **Dizer que ela é da Igreja.** Só funciona se há `aurelian_secret` (a carta de Aurelian a protege): `camp_trust` +1, sem relatório. Sem a carta, Teodor expõe a mentira: Nerys −2, `camp_trust` −1, `church_knows_nerys`.

**3. A menina no acampamento.** **Wren**, escondida num carroção de Halric, chega ao acampamento para ver Edran ou Rhys. Maren mandou um bilhete: "Traga-a de volta." Wren tem um caderno novo: os pássaros pararam, e os desenhos têm uma única direção. **Escolha (a promessa):**
 - **Prometer ensiná-la a rastrear.** Wren +3. Flag `promise_wren_teach`; pode ser cumprida em cenas curtas nos Caps. VII a IX, antes do Ato IV.
 - **Prometer levá-la ao norte um dia.** Wren +3. Flag `promise_wren_north`; **não pode ser cumprida**, pois ela morre no Ato IV. É a promessa que fica.
 - **Mandá-la de volta, sem prometer.** Wren 0. Halric a leva ao amanhecer.

**4. A Noite dos Nomes.** Na madrugada, a Chamada aumenta. Os **doentes** se levantam: o doente do Guardião (Edran, A, ou Rhys, B), e os dois **batedores locais**, **Tomm Brack** e **Pell**, que chegaram perto da caverna dias antes. Soldados acordam, clérigos rezam, cães uivam. O Guardião aprende, vendo, o que a Rota B já sabia: **o nome detém**. **Escolha importante, quem o Guardião chama primeiro:**
 - **O amigo** (Edran ou Rhys). Ele é contido, sem mudar de estágio. **Tomm e Pell caminham para o escuro.**
 - **Os batedores.** Pell é detido (o nome está no alforje dele); **Tomm, que ninguém conhece, se perde.** O amigo piora um estágio (Godric, Vesemir e Nerys o seguram com a lanterna).
 - **Organizar o acampamento:** pedir a soldados e caçadores que chamem cada um pelo nome, buscando-os no registro. **Com `camp_trust` ≥ 1, todos são detidos.** Sem confiança, o amigo piora e Tomm se perde.
 Quem se perde fica claro: **o que ninguém chama, ninguém segura.**

**5. Kaldrun ao amanhecer.** O Guardião, com **Vesemir** (insistindo em ver "a criatura"), vai à boca da caverna recuperar o corpo (ou, se ninguém se perdeu, ver o que a noite deixou). Kaldrun está lá.
 - **Rota A, primeiro contato.** **Escolha importante:** ficar imóvel (`kaldrun_bond` +2, Vesemir +1); recuar devagar (`kaldrun_bond` +1); aproximar-se de mãos abertas (`kaldrun_bond` +3, Vesemir +2: "Eu esperava medo. É outra coisa.").
 - **Rota B, segundo contato.** Sem escolha: o `kaldrun_bond` da boca da caverna decide. Com ≥ 2, Kaldrun deixa o Guardião levar o corpo; com ≥ 3, **baixa a cabeça**. Se o Guardião diz em voz alta o nome do morto, ele exala um sopro quente.
 Kaldrun vê o corpo ressecado e recua para dentro.

**6. Fim do Ato II: "Amanhã, a toca".** No acampamento, todos viram o que a noite fez e onde o corpo caiu, a poucos passos da boca da caverna. **Os caçadores (R1)** concluem: "Ele chama gente. Mate-o." A comissão (R2) pede mais um dia, a coluna (R3) aperta o prazo. Godric e Vesemir discordam. Corvin, se Tomm se perdeu, jura. Todos olham para o Guardião, o único a ter visto o animal de perto. Fim do Ato II.

---

## 5. Dimensão emocional e filosófica

- **O jogador deve sentir:** a pressa e a ordem de um acampamento, o medo da noite, a dor de ver alguém que ninguém conhece se perder, e o alívio de ouvir um nome funcionar.
- **Questões:** o que resta de uma pessoa quando ninguém a chama pelo nome? *Uma decisão necessária pode continuar sendo moralmente errada?* (a conclusão sobre o ancião). O Guardião, que não tem nome, é o único capaz de **perceber** o homem sem nome.
- **Edran e Rhys:** o medo de criar laços de Edran; o desejo de Rhys de ser conhecido, agora literal: ele só é segurado porque alguém sabe seu nome.

## 6. Efeitos em chaves

| Escolha | Efeito |
|---|---|
| Clérigo e curandeira | `camp_trust`, `church_knows_nerys` |
| Promessa a Wren | `promise_wren_teach` ou `promise_wren_north` |
| Noite dos Nomes | Quem se perde (Tomm, Pell), estágio do amigo |
| Kaldrun (A) | `kaldrun_bond` |
| Fim | H/C do acampamento: caça mais provável, em R1 principalmente |

## 7. Continuidade e ganchos

- **Fixos:** a invasão do Ato IV; Wren morre; Edran pode morrer (A, sem tratamento).
- **Dobradiça 3 (Cap. VII):** os insumos já estão postos: `kaldrun_bond`, a leitura do casulo, o relato do local, quem se perdeu na noite, a resolução (R1 a R3).
- **Cura (três ingredientes):** a flor (Namar), a resina (caverna) e a voz. As missões vão do Cap. VII ao IX.
- **Pistas pequenas:** o turíbulo de brasa; Teodor que reporta; Aurelian e a carta; Orlan e Tamsyn no acampamento (R2).

## 8. Avaliação crítica

**Pontos fortes.** A Noite dos Nomes demonstra o tema em ação, com consequências variáveis. A falsa prova prepara a tragédia do ancião. O contato com Kaldrun é diferente em cada rota.

**Riscos e correções.**
- **O capítulo é denso.** Mitigação: as partes A e B são curtas, e a maior parte está nos blocos comuns.
- **A morte de Tomm pode parecer "sacrifício obrigatório".** Mitigação: ela só ocorre se o jogador falhar em organizar o acampamento ou escolher o amigo; sempre há um caminho que salva todos.
- **A promessa a Wren é cruel.** É intencional: o jogador escolhe o peso que carrega. Prometer ensinar é uma saída que se pode cumprir.
- **O clérigo Teodor pode virar vilão fácil.** Mitigação: ele é jovem e sincero, e a denúncia nasce do medo, não da maldade.

## 9. Para sua aprovação

1. Título "A Noite dos Nomes" serve?
2. Estrutura e escolhas (clérigo e curandeira, promessa a Wren, Noite dos Nomes, Kaldrun)?
3. **Tomm** (o homem que ninguém chama) como o que se perde se o Guardião falhar?
4. **Pell e Tomm** como batedores locais? **Irmão Teodor Wick** como clérigo do acampamento?
5. A promessa a Wren: as duas versões (ensinar, levá-la ao norte) e a recusa?
