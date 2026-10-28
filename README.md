# ⚡ NEXUS Arena

**Um jogo arcade futurista para navegador que mistura pingue-pongue, futebol e uma rodada especial de roleta.**

> HTML5 · CSS3 · JavaScript · Canvas API

## 🎮 Sobre o projeto

NEXUS Arena é um jogo experimental para navegador com visual neon, partículas animadas, interface interativa e modos que mudam durante a partida. A arena, a bola e os efeitos são desenhados com a Canvas API e cálculos de perspectiva em JavaScript.

## 🖼️ Capturas de tela

<p align="center">
  <img src="screenshots/menu.png" alt="Menu inicial do NEXUS Arena" width="32%" />
  <img src="screenshots/ping-pong.png" alt="Modo ping-pong do NEXUS Arena" width="32%" />
  <img src="screenshots/futebol.png" alt="Modo futebol do NEXUS Arena" width="32%" />
</p>

## ✨ O que já existe no jogo

- **Pingue-pongue em perspectiva:** mesa, bola com trajetória, pontuação e devoluções controladas pelo mouse.
- **Futebol:** movimentação do jogador, bola, goleiro e ações do adversário.
- **Roleta especial:** quando um dos lados chega a 50 pontos, a partida muda para uma rodada inspirada em jogos de sorte.
- **Modos alternados:** a partida alterna entre pingue-pongue e futebol conforme as rodadas avançam.
- **Modo vermelho:** altera os controles temporariamente.
- **Dicas contextuais:** o jogo apresenta instruções durante a partida.
- **Efeitos visuais:** partículas, brilho neon, ondas, paletas de cores, distorção e campo orbital.
- **Menu brincalhão:** o botão “SAIR” foge do cursor; isso é intencional.

**Nota técnica:** a aparência em perspectiva é desenhada no Canvas; o projeto não usa um motor 3D nem WebGL.

## 🕹️ Controles

### Pingue-pongue

- Segure o **botão esquerdo do mouse** e arraste para desenhar a raquete holográfica.
- Cubra a bola com a área selecionada para tentar devolvê-la.
- Arrastar mais rápido pode gerar uma devolução mais forte.
- No **modo vermelho**, o botão direito passa a controlar a raquete.

### Futebol

- **W, A, S, D:** mover o jogador.
- **Espaço:** chutar quando estiver perto da bola.
- Nas fases com câmera em terceira pessoa, mova o mouse para olhar.
- No **modo vermelho**, use as **setas** para se mover e **Z** para chutar.

### Efeitos visuais com o mouse

- **Clique esquerdo sem arrastar:** cria uma onda visual.
- **Botão direito:** troca a paleta e ativa um efeito de distorção, conforme o modo atual.
- **Botão do meio:** liga ou desliga o efeito orbital.

### Roleta

- Na sua vez, use os botões desenhados na tela ou as teclas **1** e **2** para escolher o alvo.
- Ao terminar a rodada especial, clique ou pressione **Espaço/Enter** para começar uma nova partida.

## 🚀 Como executar localmente

1. Baixe o repositório em **Code → Download ZIP**.
2. Extraia o ZIP.
3. Mantenha `index.html`, `style.css`, `script.js` e `favicon.svg` na mesma pasta.
4. Abra `index.html` em um navegador atualizado.

Também é possível abrir a pasta no VS Code e usar uma extensão como Live Server. A interface carrega as fontes do Google Fonts, portanto a fonte personalizada precisa de conexão com a internet; o jogo tem fontes alternativas.

## 🌐 Publicar online com GitHub Pages

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/(root)`.
4. Clique em **Save** e aguarde o GitHub concluir a publicação.
5. Abra o endereço exibido pelo GitHub Pages para testar o jogo.
6. Depois, adicione esse endereço no campo **Website** da seção **About** do repositório.

Guia oficial: [GitHub Pages](https://docs.github.com/en/pages).

## 📁 Estrutura do projeto

```text
NEXUS-Arena/
├── index.html   # Estrutura da página e metadados
├── style.css    # Aparência, layout e animações
├── script.js    # Modos de jogo, física, controles e efeitos
├── favicon.svg  # Ícone da aba do navegador
├── screenshots/ # Capturas de tela reais do jogo
└── README.md    # Apresentação e instruções
```

## 🧰 Tecnologias

- **HTML5** — estrutura e elementos da página.
- **CSS3** — layout, tema e animações.
- **JavaScript** — regras, estados, controles e simulação.
- **Canvas API** — desenho da arena, bola, jogadores, partículas e efeitos.

## 🛠️ Status

🚧 **Em desenvolvimento.** As regras e o equilíbrio do jogo podem mudar.

## 👤 Autor

Desenvolvido por **[@jomutinho-creator](https://github.com/jomutinho-creator)**.

## 🇬🇧 English

NEXUS Arena is a futuristic browser arcade featuring perspective-based pong, soccer gameplay, a roulette-inspired special round, and interactive neon effects. It is built with HTML5, CSS3, JavaScript and the Canvas API.

To run it locally, keep `index.html`, `style.css`, `script.js` and `favicon.svg` in the same folder, then open `index.html` in a modern browser. GitHub Pages can be used to publish it online.

---

<p align="center">Made with 💙 and JavaScript.</p>
