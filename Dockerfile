FROM node:20.11-alpine

# better-sqlite3 may need a native build on alpine; install build deps,
# run npm ci, then remove them so the runtime image stays small.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && mkdir -p /app /data
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev \
 && apk del .build-deps

COPY server.js ./
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]
