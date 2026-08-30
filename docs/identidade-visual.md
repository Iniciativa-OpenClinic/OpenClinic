# Identidade Visual

*v1.0, **selada pelo fundador em 30/08/2026**, após validação em uso real: todas as decisões abaixo viveram num MVP navegável completo (todos os módulos, dois temas, três perfis) antes do selo. Cores, tipografia e forma foram reconfirmadas uma a uma nessa data; a forma, inclusive, contra duas direções alternativas em comparador visual. Como tudo no projeto, permanece revisável pela comunidade via [`GOVERNANCE.md`](../GOVERNANCE.md); as alternativas descartadas e seus motivos seguem registradas ao fim.*

## O que este documento é

A identidade visual da OpenClinic: paleta, tipografia, forma, espaçamento, movimento e regras de aplicação, da identidade do projeto (README, documentação, site, comunidade) à interface do produto. A fundação está codificada em [`design-tokens/`](./design-tokens/), agora nas **três camadas** (primitiva, semântica e de componente); um espécimen navegável com componentes vivos acompanha esta versão.

## Ponto de partida

As cores em uso nos badges do README e nos diagramas entraram no primeiro commit do repositório **sem intenção de marca**: eram utilitárias, não identidade. A referência legítima é o **logo** (`docs/assets/logo.png`), cujo gradiente verde → azul é o único gesto visual intencional do projeto até aqui. Esta identidade deriva tudo dele.

Os tons canônicos do logo foram extraídos por amostragem de pixels do arquivo (27/08/2026): verde `#5DC289`, azul `#185795`, fusão verde↔azul `#2E888A` e miolo `#F6FAFA`, que é **o mesmo papel calmo do sistema**: o fundo das telas é o branco de dentro do logo. A fusão medida reprova como texto sobre claro (4,2:1); a cor primária `#23768A` é essa fusão aprofundada até passar no piso AA.

## Princípios

Derivados do que a fisiologia da visão e a pesquisa aplicada sustentam, não do folclore de "psicologia das cores":

1. **Nenhuma cor acumula dois significados.** A marca não usa verde nem vermelho puros, deixando o "semáforo" de estados (sucesso, atenção, erro) inteiramente livre. É também a solução mais limpa para daltonismo (~8% dos homens confundem verde e vermelho).
2. **Contraste é regra, não gosto.** Piso WCAG AA (4,5:1) em todo texto; leitura contínua (evolução, anamnese, documentação) sempre em tinta escura sobre papel claro, acima de 7:1 (AAA). Todo par cor+fundo desta identidade foi medido, inclusive os nove pares do cabeçalho escuro, todos acima de 5,6:1.
3. **Neuroergonomia do turno longo.** Papel levemente tingido em vez de branco puro e fundo escuro tingido em vez de preto puro (reduzem estresse visual e halação); saturação média com um único ponto quente (respeita a atenção de quem tem TDAH); vermelho reservado exclusivamente a perigo (salência involuntária).
4. **Auto-hospedável até na fonte.** Tipografia de licença livre, empacotada com a aplicação, sem chamada a CDN, coerente com a instalação on-premise via Docker ([decisão 0003](./decisions/0003-docker-como-unidade-de-implantacao.md)) e com a LGPD.
5. **Estrutura informa, nunca decora.** Todo elemento gráfico carrega significado: o gradiente marca fronteira, a barra de acento carrega estado, a moldura escura separa ferramenta de trabalho. O que não informa, sai.

## Paleta: "Teal do encontro"

A cor primária assina o ponto onde o verde e o azul do logo se fundem. O gradiente completo vira o gesto de marca; verde e azul puros saem da interface.

**Proporção de uso** (aproximada, o "60-30-10" da marca): neutros dominam (~60%: papel, cartões, tinta), o teal estrutura (~30%: moldura, ações, navegação ativa), e o calor pontua (até 10%: terracota em encaixes, avisos de cuidado, um destaque por tela).

### Tema claro

| Papel | Hex | Uso | Contraste (sobre papel) |
| :--- | :--- | :--- | :--- |
| Primária | `#23768A` | Ações, botões, identidade | 5,2:1 · AA |
| Apoio | `#2C5F9E` | Links, camada técnica/API | 6,5:1 · AA |
| Gradiente do logo | `#5DC289 → #185795` | Gesto de marca: capa, splash e a **costura da moldura** (abaixo) | decorativo |
| Terracota (quente) | `#DE6A4E` | Destaque, chip, ilustração. **Nunca texto pequeno sobre claro** (3,4:1) | decorativo |
| Papel calmo | `#F6FAFA` | Fundo. Nunca branco puro | — |
| Tinta | `#16292F` | Toda leitura contínua | 15:1 · AAA |

### Tema escuro

| Papel | Hex | Uso | Contraste (sobre fundo) |
| :--- | :--- | :--- | :--- |
| Fundo | `#0F1D22` | Quase-preto com viés teal; evita a halação do preto puro | — |
| Cartão | `#16262C` | Superfície elevada | — |
| Borda | `#263A42` | Divisores | — |
| Texto claro | `#E4EDF0` | Leitura | 14,5:1 · AAA |
| Primária clara | `#55A5C2` | Texto e acento primário no escuro (o `#23768A` reprovaria como texto: 3,3:1) | 6,2:1 · AA |
| Terracota | `#DE6A4E` | Ganha poder no escuro: vira texto de destaque | 5,2:1 · AA |

**Regra validada no MVP:** o **fundo de ação não muda de tema**. Botão primário é `#23768A` com texto claro nos dois mundos (4,6:1 no escuro, aprovado para o peso e corpo usados). O que clareia no escuro é a primária como *texto e acento* (`#55A5C2`), nunca o botão: clareá-lo derrubaria o contraste do rótulo branco.

### Estados da interface

Regra inegociável: **estado nunca é só cor**. Sempre acompanha ícone ou rótulo.

| Estado | Hex (texto sobre claro) | Contraste |
| :--- | :--- | :--- |
| Sucesso | `#1E7A56` | 5,3:1 |
| Atenção | `#8F5F00` | 5,5:1 |
| Erro / perigo | `#B42318` (exclusivo: nada mais é vermelho) | 6,6:1 |
| Informação | `#2C5F9E` (reutiliza o apoio) | 6,5:1 |

## Tipografia: Lexend

**[Lexend](https://fonts.google.com/specimen/Lexend)** em toda a identidade e interface. Escolhida porque:

- Nasceu de pesquisa de **fluência de leitura** com leitores com dificuldade, o território da dislexia e do TDAH, público que este projeto decide acolher por desenho, não por retrofit;
- Tem o desenho de zero com corte, raro no Brasil, que distingue a marca;
- Licença **SIL OFL**, compatível com AGPL, auto-hospedável junto com a aplicação;
- Família variável com nove pesos: serve de display a legenda sem segunda família.

**Ponto fraco assumido:** o I maiúsculo e o l minúsculo são quase idênticos. Mitigação: códigos, identificadores e trechos técnicos usam **[Atkinson Hyperlegible Mono](https://fonts.google.com/specimen/Atkinson+Hyperlegible+Mono)**. A segunda colocada da disputa tipográfica volta como fonte mono: mesma pesquisa de máxima distinção de caracteres do Braille Institute, também SIL OFL e auto-hospedável. As duas fontes do sistema nasceram de pesquisa de acessibilidade.

Escala de referência: Display 700 · Título 600 · Corpo 400 · Legenda 500 em caixa alta com espaçamento · números tabulares (`font-variant-numeric: tabular-nums`) em toda coluna de dados.

## Forma: direção "Clínico equilibrado"

Selada em 30/08/2026 contra duas alternativas ("Acolhedor", mais curvo e arejado; "Instrumento", mais reto e denso), avaliadas em comparador visual com os mesmos componentes reais nos dois temas.

- **Raio de canto:** controles em `8px`, cartões em `12px`, diálogos em `16px`, blocos de agenda em `6px`, chips/busca/avatares em pílula. Curvatura moderada: a preferência por contornos curvos é um dos achados mais robustos da estética experimental (contornos angulosos ativam mais a amígdala, Bar & Neta, 2006), mas angularidade demais comunica frieza e arredondamento demais mina a seriedade. O meio-termo é a "ponte clínica + dev" em forma de canto.
- **Sombra:** **elevação por contraste de superfície + borda fina** (cartão claro sobre fundo tingido), não por sombra. Sombra real é exclusiva do que flutua: menu, popover, diálogo, toast. Interface totalmente plana esconde o que é clicável; sombra em tudo vira ruído que disputa com o dado clínico.
- **Assinatura estrutural, a moldura:** barra lateral **e cabeçalho** usam a família escura **nos dois temas**, fundidos numa moldura contínua em "L" que emoldura a área clara de trabalho. O croma escuro recua como fundo; a atenção involuntária (guiada por luminância) cai onde o trabalho está. O bloco da marca é cabeçalho fixo da barra; a rolagem da navegação nasce na linha de costura abaixo dele e nunca o move.
- **A costura de gradiente:** o gradiente do logo (verde → teal → azul, 3px) corre na **borda inferior do cabeçalho**, a linha do horizonte entre moldura e conteúdo. Promoção deliberada de enfeite a informação: o gradiente *codifica a fronteira* e vira marco espacial permanente (o conteúdo desliza sob ele no rolar). Esta é a única presença do gradiente dentro do produto.

## Espaçamento

Escala base validada no MVP: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 48** (px). Consistência de passo é sinal silencioso de profissionalismo; valores fora da escala só com justificativa registrada.

**Doutrina do respiro dual**, a resolução honesta entre "espaço é confiança" e "prontuário é ferramenta densa":

- **Superfícies de operação** (agenda, tabelas, listas de trabalho): densidade da direção selada. Muitas linhas por tela é requisito de quem varre dados o dia inteiro, não falha de calma.
- **Superfícies de confiança e decisão** (estados vazios, diálogos de risco como cancelar, assinar e cofre, primeiros acessos, telas públicas): respiro alto, um elemento dominante, margens generosas. Onde o usuário decide ou hesita, o espaço desacelera e acolhe.

Alvos de toque: mínimo **44px** em viewports de até 768px, sem exceção, inclusive dentro de formulários densos.

## Movimento

Dois ritmos, medidos para o turno de trabalho: **100ms** para micro-interações de alta frequência (a recepção executa dezenas por hora; lentidão repetida vira atrito acumulado) e **160ms** para mudanças espaciais, com teto de **220ms**. Easing suave padrão (`cubic-bezier(0.2, 0, 0, 1)`). Movimento **informa** (de onde veio, para onde foi), nunca decora.

**Regra selada em uso, entrada é só opacidade:** animações de entrada de superfície (troca de view, abas, painéis) animam exclusivamente `opacity`, nunca `transform`. Motivo descoberto em produção do MVP: com `prefers-reduced-motion` (durações zeradas), um keyframe de entrada com `translateY` pode congelar no primeiro quadro e deixar a superfície permanentemente deslocada, quebrando layout exatamente para o público que o modo reduzido protege. Deslocamento espacial fica restrito a resposta direta de interação (hover, drag) em elemento já presente.

`prefers-reduced-motion` zera todas as durações: animação dispara vertigem real em quem tem disfunção vestibular.

## Logo em uso

O canônico segue sendo `docs/assets/logo.png` (2000×2000, fundo transparente; vetor permanece pendente).

- **Na barra de navegação:** símbolo a **36px**, à esquerda, com o nome ao lado, como âncora do trilho de leitura, com o centro óptico alinhado à linha do cabeçalho. No modo recolhido (64px), símbolo sozinho, centralizado.
- **Favicon:** 64×64 gerado do canônico, embutido na aplicação.
- **Área de proteção:** no mínimo metade da largura do símbolo em todos os lados; nada encosta no logo.
- **Fundos:** o logo vive sobre o papel calmo, sobre a moldura escura e sobre o gradiente de marca. Nunca sobre fotografia ou padrão que dispute com ele.
- **Centralizado, só em cerimônia:** telas de identidade (login, splash, material institucional). Dentro da ferramenta, o logo é sempre âncora à esquerda; decisão registrada com análise em 30/08/2026.

## Voz da interface

Destilada da prática do MVP; vale para todo texto de produto:

- **Leigo primeiro:** o rótulo nomeia o que a pessoa reconhece, não como o sistema foi construído ("Fila de marcação", não "queue de scheduling").
- **O hint explica o porquê**, não repete o rótulo ("Sem autorização expressa do paciente, o atestado sai sem diagnóstico: LGPD e ética médica").
- **Erro diz como corrigir**, perto do campo, sem culpa e sem pedido de desculpas ("CPF incompleto: confira o último dígito").
- **Ação nomeia o efeito** ("Desmarcar consulta" gera o aviso "Consulta desmarcada", com "Desfazer" quando reversível).
- Jargão regulatório aparece **traduzido primeiro**, sigla depois.
- **Sem travessões na copy:** a pontuação da marca resolve com dois pontos, vírgula ou frase nova. Decisão do fundador, 30/08/2026.

## Componentes

A camada de componente dos tokens (`design-tokens/tokens.json`, grupo `component`, com espelho em `tokens.css`) registra os valores canônicos de **botão, campo, pill, cartão, tabela, abas, toast, bloco de agenda, diálogo e barra de navegação**, extraídos do MVP validado, não desenhados no vácuo. Toda cor da camada de componente é referência à camada semântica; nenhum componente introduz cor própria.

## Regras de aplicação

**Sempre:** leitura contínua em tinta sobre papel calmo (7:1 ou mais) · gradiente do logo só como gesto de marca e como a costura da moldura · terracota para calor (chip, destaque; texto de destaque apenas no tema escuro) · estado com ícone ou rótulo · fonte mono com números tabulares em coluna de dados · fontes empacotadas com a aplicação · alvo de toque de 44px ou mais no mobile · entrada de superfície só com opacidade.

**Nunca:** branco `#FFFFFF` ou preto `#000000` puros como fundo de tela · gradiente em botão, fundo de leitura ou componente de dado · terracota como texto pequeno sobre claro · vermelho fora de erro/perigo · verde como cor de marca (verde pertence ao estado de sucesso) · par cor+fundo sem contraste verificado · informação apenas por cor · `transform` em animação de entrada · botão primário clareado no tema escuro · travessão na copy.

## Alternativas descartadas

No padrão do projeto: tese vencida não é apagada.

- **Cores dos badges do README como base da paleta.** Entraram no primeiro commit sem intenção de marca; tratá-las como identidade seria consagrar um acidente.
- **OpenDyslexic.** A fonte mais associada à dislexia, mas a pesquisa não confirma ganho real de leitura, e a estética minaria a seriedade de um prontuário. O consenso científico aponta características (formas abertas, caracteres inconfundíveis, espaçamento generoso), não uma fonte mágica.
- **Atkinson Hyperlegible Next, Inclusive Sans e Andika.** Candidatas fortes de acessibilidade, avaliadas em espécimen com prova de ambiguidade (Il1, 0O, bdpq). A Lexend venceu pela pesquisa de fluência e pelo desenho do zero; a Atkinson fica registrada como segunda colocada.
- **Direção "verde-guia"** (verde do logo aprofundado como primária). A mais rara no mercado, mas colide com o verde de "sucesso" da interface e com o eixo verde/vermelho do daltonismo.
- **Direção "azul-guia"** (azul do logo como primária). A de menor atrito e a mais genérica: metade da saúde e da tecnologia é azul.
- **Âmbar como cor quente.** Bonito, mas carrega a convenção de "atenção" em interface; acumularia dois significados. A terracota assume o calor; o eixo do âmbar permanece disponível para o estado de atenção.
- **Forma "Acolhedor"** (raios 8·11·16, respiro maior), mais curva e calma ao custo de densidade nas telas de operação; **e "Instrumento"** (raios 3·5·8, respiro justo), mais linhas por tela ao custo de acolhimento. Ambas avaliadas em comparador com componentes reais nos dois temas (30/08/2026); a direção atual venceu como o meio-termo consciente.
- **Cabeçalho claro separado da barra escura**, o layout original. Substituído pela moldura fundida após análise de figura-fundo: dois cromas de ferramenta obrigavam o olho a classificar três territórios em vez de dois, e o cabeçalho claro competia com o conteúdo.
- **Gradiente como filete no topo da página.** Encostado no croma do navegador, era descartado pelo olho como decoração de borda. Descido para a base do cabeçalho, virou fronteira codificada.

## Pendências

- **Versão vetorial (SVG) do logo.** O canônico atual é PNG 2000×2000 com fundo transparente; vetor segue desejável para escala e impressão. Readequação de cor não é necessária: a fusão medida (`#2E888A`) confirma a família da primária.
- **Realinhar badges e diagramas** do README, `CONTRIBUTING.md` e `GOVERNANCE.md` à paleta, desbloqueado pelo selo desta versão; execução em rodada própria.
- **Registro em [`decisions/`](./decisions/)**, se o grupo entender que identidade visual merece ADR própria; este documento fornece o contexto e as alternativas.

*Resolvidas nesta versão: camada de componente dos tokens (extraída do MVP) e refinamento do tema escuro com telas reais.*
