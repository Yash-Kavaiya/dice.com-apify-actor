# Use the official Apify SDK image with Node.js 20
FROM apify/actor-node:20

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install --include=dev \
    && npm cache clean --force

# Copy source files
COPY . ./

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set environment to production
ENV NODE_ENV=production

# Run the actor
CMD npm start
