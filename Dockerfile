# 1. Aşama: Build aşaması
FROM node:18-alpine AS build

WORKDIR /app

# Package.json ve package-lock.json dosyalarını kopyala
COPY package.json package-lock.json ./

# Bağımlılıkları yükle
RUN npm install

# Tüm kaynak kodları kopyala
COPY . .

# Build işlemini gerçekleştir
RUN npm run build

# 2. Aşama: Nginx ile Serve Etme
FROM nginx:stable-alpine

# Nginx config ayarlarını eklemek istersen
COPY ./nginx.conf /etc/nginx/nginx.conf

# Build edilen dosyaları Nginx'in public dizinine kopyala
COPY --from=build /app/build /usr/share/nginx/html

# Nginx portunu aç
EXPOSE 80

# Nginx başlat
CMD ["nginx", "-g", "daemon off;"]
