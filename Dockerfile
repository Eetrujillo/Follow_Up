# Build stage: compile the Angular SPA into static files.
#
# Angular 21 needs Node ^20.19 || ^22.12 || ^24, so the bookworm-slim image
# (latest 22.x) satisfies it. The application builder emits to
# dist/follow-up/browser, which is what the runtime stage copies.
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# `ng build` defaults to the production configuration (see angular.json).
RUN npm run build

# Runtime stage: nginx serves the static bundle and proxies /api to the backend
# over the compose network. Nothing here is executed at request time; the image
# is immutable and the config lives in nginx.conf.
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/follow-up/browser /usr/share/nginx/html

# Matches the container side of the published port in docker-compose.yml
# ("${FRONTEND_PORT:-3202}:3202").
EXPOSE 3202

CMD ["nginx", "-g", "daemon off;"]
