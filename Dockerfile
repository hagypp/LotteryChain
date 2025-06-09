# Use Node.js base image
FROM node:18

# Install netcat (OpenBSD variant)
RUN apt-get update && apt-get install -y netcat-openbsd

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app
COPY . .

# Expose ports (React: 3000, Hardhat: 8545)
EXPOSE 3000 8545

# Default command (can be overridden in docker-compose)
CMD ["npm", "start"]
