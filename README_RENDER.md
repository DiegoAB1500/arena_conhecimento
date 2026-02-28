# Instruções para Deploy no Render

Este guia ensina como colocar a **Arena do Conhecimento** online usando o Render.com.

## 1. Preparação (O que você tem aqui)
Esta pasta `deploy_me` contém apenas os arquivos necessários para o funcionamento. Os scripts já estão configurados:
- **Build**: `npm run build` (Prepara o Next.js)
- **Start**: `node server.js` (Inicia o servidor com Socket.io)

## 2. Passo a Passo

### Parte A: Subir para o GitHub
1. Crie um novo repositório **Privado** no seu GitHub.
2. Dentro desta pasta `deploy_me`, inicialize o git e suba os arquivos:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git branch -M main
   git remote add origin SEU_LINK_DO_GITHUB
   git push -u origin main
   ```

### Parte B: Configurar no Render.com
1. Faça login no [Render.com](https://render.com).
2. Clique em **New +** > **Web Service**.
3. Conecte sua conta do GitHub e selecione o repositório da "Arena do Conhecimento".
4. Configure os campos:
   - **Name**: `arena-do-conhecimento`
   - **Environment**: `Node`
   - **Region**: (Escolha a mais próxima, ex: Ohio ou Frankfurt)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (ou o de sua preferência)

### Parte C: Variáveis de Ambiente (Environment Variables)
No painel do seu Web Service no Render, vá em **Environment** e adicione:
- `NODE_ENV`: `production`
- `TEACHER_PASSWORD`: `SUA_SENHA_AQUI` (a senha para logar como professor)
- `PORT`: `10000` (O Render geralmente define isso sozinho, mas é bom garantir)

## 3. Considerações Importantes
- O plano **Free** do Render "dorme" após 15 minutos de inatividade. O primeiro acesso pode demorar uns 30 segundos para acordar o servidor.
- Como o banco de dados de jogadores é em memória, se o servidor reiniciar ou dormir, o ranking atual e a partida ativa serão resetados.
