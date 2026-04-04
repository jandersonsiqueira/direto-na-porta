# Direto na Porta - Frontend + Serverless catalog

Projeto React (Vite) com uma rota serverless em `/api/catalog` pronta para deploy na Vercel.

Como usar

1. Instale dependências:

   npm install

2. Configure a variável de ambiente `LOYVERSE_TOKEN` no painel da Vercel (ou localmente em um .env quando rodar localmente com algo como `cross-env`).

3. Para rodar localmente:

   - Frontend apenas (Vite):

     npm run dev

     Isto inicia só o frontend em http://localhost:5173; a rota `/api/catalog` não estará disponível neste modo.

   - Frontend + funções serverless (emular Vercel localmente):

     npx vercel login
     npx vercel dev

     Use `npx vercel dev` na raiz do projeto para servir também as rotas em `api/` (não é necessário instalar o CLI globalmente).

4. Deploy:

   - Conecte o repositório ao Vercel e defina `LOYVERSE_TOKEN` nas Environment Variables.
   - Deploy normalmente (push para a branch conectada). Você também pode usar o CLI:

     npx vercel --prod

Observações

- O checkout é feito abrindo o WhatsApp com a mensagem do pedido já preenchida (sem backend adicional).
- Nunca coloque `LOYVERSE_TOKEN` no código cliente.

