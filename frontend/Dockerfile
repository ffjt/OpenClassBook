FROM node:20-alpine AS base

WORKDIR /app

RUN corepack enable

COPY package.json ./

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]
