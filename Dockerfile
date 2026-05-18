FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Ensure tzdata is configured non-interactively
ENV DEBIAN_FRONTEND=noninteractive

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy the rest of the application
COPY . .

# Build the Vite frontend
RUN npm run build

# Expose port (Cloud Run sets PORT environment variable, usually 8080)
EXPOSE 8080

# Run the production server
ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
