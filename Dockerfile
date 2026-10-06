FROM node:24-alpine AS signs
WORKDIR /app
COPY apps/signs/package.json apps/signs/package-lock.json ./
RUN npm ci
COPY apps/signs/ ./
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY apps/hub/ /usr/share/nginx/html/
COPY apps/bestiary/index.html /usr/share/nginx/html/bestiary/
COPY apps/bestiary/assets/ /usr/share/nginx/html/bestiary/assets/
COPY apps/bestiary/data/data.js /usr/share/nginx/html/bestiary/data/data.js
COPY apps/bestiary/img/ /usr/share/nginx/html/bestiary/img/
COPY apps/armourer/index.html /usr/share/nginx/html/armourer/
COPY apps/armourer/assets/ /usr/share/nginx/html/armourer/assets/
COPY apps/armourer/data/data.js /usr/share/nginx/html/armourer/data/data.js
COPY apps/armourer/img/ /usr/share/nginx/html/armourer/img/
COPY --from=signs /app/dist-static/ /usr/share/nginx/html/signs/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
