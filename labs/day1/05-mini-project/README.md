# Lab 5 — Mini-Project: Containerize React Frontend (60 นาที)

> โจทย์: ทำให้ **`app/web`** (React + Vite + TypeScript) รันใน Docker ได้ 2 แบบ
> เฉลยอยู่ที่ `solutions/day1/web/` — พยายามทำเองก่อนนะ 🙂

## ส่วนที่ 1 — Production image (multi-stage → nginx)

สร้าง `app/web/Dockerfile` ที่มี 2 stage:

1. **build**: `FROM node:24-alpine` → `npm ci` → `npm run build` (ได้โฟลเดอร์ `dist/`)
2. **serve**: `FROM nginx:1.29-alpine` → copy `dist/` ไปที่ `/usr/share/nginx/html`

อย่าลืม `.dockerignore` และให้ cache ของ `npm ci` ทำงาน (copy `package*.json` ก่อน)

**เป้าหมาย:** image < 100 MB

```bash
cd app/web
docker build -t todo-web:1.0 .
docker run -d --name web -p 8080:80 todo-web:1.0
```

## ส่วนที่ 2 — ให้ web คุยกับ api (ใช้ nginx reverse proxy)

React ใน browser เรียก `/api/...` → nginx ต้องส่งต่อไปที่ container `api`
ใช้ไฟล์ `nginx.conf.template` จากเฉลยได้ แล้วลอง:

```bash
docker network create todo-net
docker run -d --name api --network todo-net todo-api:1.0
docker run -d --name web --network todo-net -p 8080:80 todo-web:1.0
```

เปิด <http://localhost:8080> → เพิ่ม todo ได้ ✅
❓ ทำไม nginx รู้จักชื่อ `api`? → **คำตอบอยู่ในวันที่ 2 (Networking)**

## ส่วนที่ 3 — Development container + hot reload

สร้าง `app/web/Dockerfile.dev` ที่รัน `npm run dev` (Vite dev server, port 5173)

```bash
docker build -f Dockerfile.dev -t todo-web:dev .
docker run --rm -p 5173:5173 \
  -v "${PWD}:/app" -v /app/node_modules \
  -e VITE_USE_POLLING=true \
  -e API_URL=http://host.docker.internal:3000 \
  --add-host=host.docker.internal:host-gateway \
  todo-web:dev
```

(รัน api ไว้ด้วย: `docker run -d -p 3000:3000 todo-api:1.0`)

แก้ `const TITLE` ใน `src/App.tsx` → browser เปลี่ยนเองทันที 🎉

| flag | ทำไมต้องมี |
|---|---|
| `-v "${PWD}:/app"` | bind mount โค้ดเข้าไป |
| `-v /app/node_modules` | กันไม่ให้ `node_modules` ของเครื่องเรา (หรือโฟลเดอร์ว่าง) ทับของใน image |
| `VITE_USE_POLLING=true` | Windows ไม่ส่ง file-change event ผ่าน bind mount → ให้ Vite ตรวจเอง |
| `host.docker.internal` | ชื่อที่ชี้กลับมาที่ "เครื่องเรา" จากใน container |

## เกณฑ์ผ่าน

- [ ] `todo-web:1.0` < 100 MB และเปิดหน้าเว็บได้
- [ ] เพิ่ม/ลบ todo ผ่านหน้าเว็บได้ (web ↔ api)
- [ ] แก้โค้ดแล้วเห็นผลทันทีใน dev container
- [ ] push `todo-web:1.0` ขึ้น Docker Hub ของตัวเอง
