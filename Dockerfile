FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY FrontEnd/package*.json ./FrontEnd/
COPY BackEnd/package*.json ./BackEnd/
RUN npm ci && npm --prefix FrontEnd ci && npm --prefix BackEnd ci
COPY --chown=node:node . .
USER node
ENV EXPO_NO_TELEMETRY=1
EXPOSE 3000 8081
CMD ["npm", "start"]
