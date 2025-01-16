FROM node:18-alpine

# Install OpenSSL to avoid Prisma issues
RUN apk update && apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

# Remove CLI packages since we don't need them in production by default.
RUN npm remove @shopify/cli

COPY . .

# After the build step, list the contents of the build directory
RUN npm run build && echo "Build completed" && ls -la ./build && ls -la ./build/server


CMD ["npm", "run", "docker-start"]