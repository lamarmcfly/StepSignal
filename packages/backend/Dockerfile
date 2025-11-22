FROM node:22-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/backend ./packages/backend

# Install dependencies
RUN npm install

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Generate Prisma client and build database package
WORKDIR /app/packages/database
RUN npx prisma generate
RUN npm run build

# Return to app root
WORKDIR /app

# Expose backend port
EXPOSE 3000

# Start backend
CMD ["npm", "run", "dev", "--workspace=@stepsignal/backend"]
