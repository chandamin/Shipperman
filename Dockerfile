FROM node:18-alpine

# Install OpenSSL to avoid Prisma issues
RUN apk update && apk add --no-cache openssl

# Expose the app's port
EXPOSE 3000

# Set the working directory
WORKDIR /app

# Set the environment variable to production
ENV NODE_ENV=production

# Copy the package.json and package-lock.json to the container
COPY package.json package-lock.json* ./

# Remove the @shopify/cli package (if necessary)
RUN npm remove @shopify/cli || true

# Install node modules with the --legacy-peer-deps option to bypass dependency conflicts
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Command to start the application
CMD ["npm", "run", "docker-start"]
