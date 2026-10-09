FROM node:24-alpine
WORKDIR /app
COPY package.json server.cjs race-hub.cjs tracks.json three.min.js THREE_LICENSE.txt ./
ENV HOST=0.0.0.0
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.cjs"]
