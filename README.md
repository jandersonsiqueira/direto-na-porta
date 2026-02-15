# Direto na Porta - Frontend + Serverless catalog

Projeto React (Vite) com uma rota serverless em `/api/catalog` pronta para deploy na Vercel.

Como usar

1. Instale dependências:

   npm install

2. Configure a variável de ambiente `LOYVERSE_TOKEN` no painel da Vercel (ou localmente em um .env quando rodar localmente com algo como `cross-env`).

3. Para rodar localmente:

   npm run dev

4. Deploy:

   - Conecte o repositório ao Vercel e defina `LOYVERSE_TOKEN` nas Environment Variables.
   - Deploy normalmente. A rota `/api/catalog` fará o proxy para a API da Loyverse sem expor o token.

Observações

- O checkout é feito abrindo o WhatsApp com a mensagem do pedido já preenchida (sem backend adicional).
- Nunca coloque `LOYVERSE_TOKEN` no código cliente.

