FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY client/src/ ./src/
COPY client/public/ ./public/
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tailwind.config.ts ./
COPY frontend/postcss.config.js ./

ARG VITE_PB_URL
ENV VITE_PB_URL=${VITE_PB_URL}

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
