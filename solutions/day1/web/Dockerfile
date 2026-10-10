# ---------- stage 1: build React ด้วย Vite ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- stage 2: เสิร์ฟไฟล์ static ด้วย nginx ----------
FROM nginx:1.29-alpine
# ไปหา API ที่ไหน — เปลี่ยนตอน run ได้ (runtime config) ต่างจาก VITE_* ที่ฝังตอน build
ENV API_UPSTREAM=api:3000
# ไฟล์ใน /etc/nginx/templates จะถูกแทนค่า ${ENV} แล้ววางที่ /etc/nginx/conf.d ตอน start
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
