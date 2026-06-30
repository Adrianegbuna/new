FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Next.js app for production
RUN npm run build

EXPOSE 3000

# Start the production server
CMD ["npm", "start"]