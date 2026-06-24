# Cartas para o Farol — Web Multiplayer + Mobile

Esta é a versão web para Vercel com:

- jogo single-player;
- multiplayer online por salas;
- código de sala para amigos;
- Supabase Realtime;
- bots/NPCs andando em tempo real;
- suporte mobile com campo de digitação focado para abrir o teclado virtual;
- visual de máquina de escrever;
- roleta de risco;
- 3 vidas;
- barra de progresso de todos os jogadores.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Configurar Supabase

1. Crie um projeto no Supabase.
2. Abra o **SQL Editor**.
3. Cole e rode o conteúdo de:

```text
supabase/schema.sql
```

4. Vá em **Project Settings > API**.
5. Copie:
   - Project URL
   - anon public key

6. Crie um arquivo `.env.local` na raiz:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

7. Rode novamente:

```bash
npm run dev
```

## Configurar na Vercel

Na Vercel, adicione estas Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Depois faça deploy.

## Como jogar online

1. Um jogador clica em **Criar sala online**.
2. O jogo mostra um código, por exemplo:

```text
FAROL-7XK2
```

3. O amigo abre o mesmo site.
4. Digita o código.
5. Clica em **Entrar na sala**.

O seu marcador aparece em azul.  
Os amigos aparecem em vermelho.  
Os bots aparecem em vermelho claro.

## Jogar no celular

No celular:

1. Abra o site.
2. Toque em **Jogar sozinho**, **Criar sala online** ou **Entrar na sala**.
3. O jogo tenta abrir o teclado automaticamente.
4. Se o navegador bloquear, toque no botão:

```text
Toque aqui para digitar
```

Por segurança, navegadores mobile geralmente só abrem teclado após toque do usuário.  
Por isso o jogo usa um input real, quase invisível, focado após o clique inicial.

## Publicar na Vercel

Pelo GitHub:

```bash
git init
git add .
git commit -m "cartas para o farol web multiplayer"
git branch -M main
git remote add origin LINK_DO_REPOSITORIO
git push -u origin main
```

Depois importe o repositório na Vercel.

Pela CLI:

```bash
npm i -g vercel
vercel login
vercel
vercel deploy --prod
```

## Arquivos principais

```text
components/GameClient.tsx
lib/multiplayer.ts
lib/supabaseClient.ts
supabase/schema.sql
app/globals.css
```

## Observação

Esta versão usa Supabase como backend Realtime.  
Sem configurar Supabase, o modo solo funciona, mas salas online não funcionam.
