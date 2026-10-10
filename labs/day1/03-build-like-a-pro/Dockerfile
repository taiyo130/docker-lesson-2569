# ✅ Multi-stage build สำหรับ Express + TypeScript

# ---------- stage 1: ติดตั้ง dependencies ทั้งหมด (รวม devDependencies) ----------
FROM node:24-alpine AS deps
WORKDIR /app
# copy แค่ package*.json ก่อน → layer นี้ cache ไว้ได้จนกว่า dependency จะเปลี่ยน
COPY package.json package-lock.json ./
RUN npm ci

# ---------- stage 2: compile TypeScript → JavaScript ----------
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- stage 3: image ที่ใช้รันจริง (เล็ก ไม่มี compiler ไม่มี source) ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# ไม่รันด้วย root — image node มี user ชื่อ node ให้แล้ว
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "dist/server.js"]
