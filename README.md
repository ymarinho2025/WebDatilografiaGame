# Cartas para o Farol — Versão Web para Vercel

Este projeto é a versão web do jogo **Cartas para o Farol**, pronto para publicar na Vercel.

## O que está incluído

- Next.js + React.
- Visual de mesa de datilografia.
- Texto por linhas.
- Digitação em tempo real, sem Enter.
- Roleta de risco.
- 3 vidas.
- Tela vermelha de derrota.
- Pergunta do dobro do prêmio.
- Pegadinha ao clicar em “Não”.
- Barra de progresso visível.
- Bots/NPCs andando em tempo real.
- NPC Yuri: `25.1 WPM / 125.5 CPM`.
- NPC Ana: `12.55 WPM / 62.75 CPM`, metade da velocidade do Yuri.
- Som de tecla, erro, roleta, retorno da máquina e suspense de fundo.
- Frases em ordem aleatória.
- Fase “Noites escuras” em russo transliterado com alfabeto brasileiro.

## Aviso sobre letras de músicas

Este projeto não inclui letras completas de músicas protegidas por direitos autorais.  
As fases com nomes de músicas usam textos autorais temáticos.

## Rodar localmente

Instale as dependências:

```bash
npm install
```

Rode em modo desenvolvimento:

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Publicar na Vercel pelo GitHub

1. Crie um repositório no GitHub.
2. Envie este projeto para o repositório.
3. Entre na Vercel.
4. Clique em **Add New Project**.
5. Importe o repositório.
6. Clique em **Deploy**.

## Publicar pela Vercel CLI

Instale a CLI:

```bash
npm i -g vercel
```

Faça login:

```bash
vercel login
```

Deploy de teste:

```bash
vercel
```

Deploy final:

```bash
vercel deploy --prod
```

## Estrutura

```text
cartas-para-o-farol-vercel/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── GameClient.tsx
│   ├── Hud.tsx
│   ├── RaceProgress.tsx
│   ├── Roulette.tsx
│   └── TypewriterScene.tsx
├── lib/
│   ├── audio.ts
│   ├── bots.ts
│   ├── phrases.ts
│   └── text.ts
├── package.json
├── next.config.mjs
├── tsconfig.json
├── vercel.json
└── README.md
```

## Observação sobre multiplayer

Esta versão web é para publicar rápido e permitir que qualquer pessoa jogue pelo navegador com bots.  
Para multiplayer real com salas online, o próximo passo recomendado é adicionar Supabase Realtime ou outro serviço WebSocket.
