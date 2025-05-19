# chef_ai/frontend-cookbook-ai/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# build
COPY . .
RUN npm run build

# ship with nginx
FROM nginx:alpine
# drop default site
RUN rm /etc/nginx/conf.d/default.conf

# our fallback‐to‐index.html config
COPY nginx.conf /etc/nginx/conf.d/

# copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
