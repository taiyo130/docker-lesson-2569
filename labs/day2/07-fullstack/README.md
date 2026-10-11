# Lab 7 — Workshop: web + api + db ด้วย Compose (75 นาที)

> เป้าหมาย: ทั้งแอปขึ้นด้วยคำสั่งเดียว ข้อมูลไม่หาย และไฟล์พร้อมเอาไปใช้ใน CI/CD ตอนบ่าย

ต่อจาก Lab 6 — ทำงานในโฟลเดอร์ `app/`

## 7.1 เพิ่ม web

เพิ่ม service `web` ใน `compose.yaml`:

```yaml
  web:
    build: ./web
    ports:
      - "${WEB_PORT:-8080}:80"
    depends_on:
      - api
    restart: unless-stopped
```

```powershell
docker compose up -d --build --wait
docker compose ps
```

เปิด <http://localhost:8080> → เพิ่ม todo → ดู footer ต้องเห็น **store: postgres**

> web (nginx) ส่ง `/api/...` ต่อไปที่ `api:3000` — ค่า default `API_UPSTREAM=api:3000` ใน Dockerfile ของ Lab 5
> ชื่อ `api` ตรงกับชื่อ service จึงใช้ได้ทันที

## 7.2 เก็บข้อมูลด้วย named volume

ตอนนี้ลอง `docker compose down` แล้ว `up` ใหม่ → todo หายหมด เพราะ db ยังไม่มี volume

เพิ่มใน `compose.yaml`:

```yaml
services:
  db:
    # ...
    volumes:
      - pgdata:/var/lib/postgresql   # Postgres 18+ ใช้ path นี้

volumes:
  pgdata:
```

ทดสอบ:

```powershell
docker compose up -d --wait
irm http://localhost:8080/api/todos -Method Post -ContentType "application/json" -Body '{"title":"persist me"}'

docker compose down            # ลบ container + network
docker compose up -d --wait
irm http://localhost:8080/api/todos      # ยังอยู่ ✅

docker compose down -v         # -v = ลบ volume ด้วย
docker compose up -d --wait
irm http://localhost:8080/api/todos      # ว่าง — ข้อมูลหาย
```

> ⚠️ `down -v` บน server = ลบ database ทิ้ง ใช้เฉพาะตอนอยากเริ่มใหม่จริง ๆ

## 7.3 ตั้งชื่อ image ให้พร้อมสำหรับ CI/CD

ใส่ทั้ง `build:` และ `image:` — บนเครื่องเรา build เอง, บน server ดึง image ที่ CI build ไว้

```yaml
  api:
    build: ./api
    image: ${API_IMAGE:-todo-api}:${TAG:-latest}
    environment:
      DATABASE_URL: postgres://todo:${POSTGRES_PASSWORD}@db:5432/todo
      APP_VERSION: ${TAG:-dev}       # แสดงใน footer ว่ารันเวอร์ชันไหนอยู่
  # ...
  web:
    build: ./web
    image: ${WEB_IMAGE:-todo-web}:${TAG:-latest}
```

```powershell
docker compose build
docker images todo-*
```

| บนเครื่องเรา | บน server (บ่ายนี้) |
|---|---|
| `docker compose up -d --build` | `docker compose pull` แล้ว `up -d --no-build` |
| image `todo-api:latest` | image `ghcr.io/<user>/todo-cicd-api:<git sha>` |

## 7.4 ภารกิจ (ทำให้ครบก่อนพักเที่ยง)

1. แก้ `const TITLE` ใน `web/src/App.tsx` แล้วรัน `docker compose up -d --build web` — build ใหม่แค่ web ตัวเดียว
2. ดู log ทุกตัวพร้อมกัน: `docker compose logs -f` แล้วกดปุ่มในเว็บ
3. เข้าไปดูข้อมูลใน database ตรง ๆ:
   ```powershell
   docker compose exec db psql -U todo -c "SELECT * FROM todos"
   ```
4. หยุด api: `docker compose stop api` → เว็บยังเปิดได้ไหม? เพิ่ม todo ได้ไหม? → `docker compose start api`
5. ⭐ ใส่ `ports:` ให้ db ชั่วคราวแล้วต่อด้วยโปรแกรม database ในเครื่อง — แล้วลบออก ทำไม production ไม่ควรเปิด?

## ✅ Checkpoint

`app/compose.yaml` ของเราควรเหมือน [`solutions/day2/compose.yaml`](../../../solutions/day2/compose.yaml)
และมี `app/.env.example` (คัดลอกจาก [`solutions/day2/.env.example`](../../../solutions/day2/.env.example))

```powershell
cp ../solutions/day2/.env.example .env.example
docker compose down
```
