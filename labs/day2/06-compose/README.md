# Lab 6 — Docker Compose + Networking (90 นาที)

> เป้าหมาย: เปลี่ยนคำสั่ง `docker run` ยาว ๆ หลายบรรทัดเป็นไฟล์เดียว และเข้าใจว่า container หากันเจอได้อย่างไร

ทำงานในโฟลเดอร์ `app/` ของ repo นี้ — ต้องมี `app/api/Dockerfile` (Lab 3) และ `app/web/Dockerfile` (Lab 5) แล้ว
ยังไม่มี? คัดลอกจากเฉลย:

```powershell
cp labs/day1/03-build-like-a-pro/Dockerfile, labs/day1/03-build-like-a-pro/.dockerignore app/api/
cp solutions/day1/web/Dockerfile, solutions/day1/web/nginx.conf.template, solutions/day1/web/.dockerignore app/web/
```

## 6.1 ปัญหา: ถ้าจะรันทั้งแอปด้วย `docker run` (แค่อ่าน ไม่ต้องรัน)

```powershell
docker network create todo-net
docker volume create pgdata
docker run -d --name db  --network todo-net -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql postgres:18-alpine
docker run -d --name api --network todo-net -e DATABASE_URL=postgres://postgres:secret@db:5432/postgres todo-api:1.0
docker run -d --name web --network todo-net -p 8080:80 todo-web:1.0
```

5 คำสั่ง ต้องจำลำดับ ต้องจำ flag และเพื่อนในทีมต้องพิมพ์ตามให้เหมือนเป๊ะ → **Compose** เก็บทั้งหมดนี้ไว้ในไฟล์เดียวที่ commit ได้

## 6.2 compose.yaml แรก: db + api

สร้างไฟล์ `app/compose.yaml`:

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: todo

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://todo:secret@db:5432/todo
    ports:
      - "3000:3000"
    depends_on:
      - db
```

```powershell
cd app
docker compose up -d --build
docker compose ps -a
docker compose logs api
```

🤔 **api ตาย** (`Exited (1)`) แม้จะใส่ `depends_on` แล้ว:

```
api-1  | Error: connect ECONNREFUSED 172.22.0.2:5432
api-1  |     at async PostgresStore.init (file:///app/dist/store.js:38:9)
```

> `depends_on` แค่ **เรียงลำดับการ start** — db container start แล้ว แต่ Postgres ยังเตรียมตัวไม่เสร็จ
> สังเกตด้วยว่า `db` ถูกแปลงเป็น IP `172.22.0.2` ให้แล้ว → ชื่อ service ใช้เป็น hostname ได้

## 6.3 แก้ด้วย healthcheck

แก้ `compose.yaml`:

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: todo
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo -d todo"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://todo:secret@db:5432/todo
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy   # รอจน pg_isready ผ่าน
    restart: unless-stopped
```

```powershell
docker compose up -d
docker compose ps          # db: (healthy)  api: (healthy)
irm http://localhost:3000/api/info    # store: postgres ✅
```

> `--wait` ทำให้ `up` รอจนทุก service healthy ก่อนจบคำสั่ง — จะได้ใช้ใน CD ตอนบ่าย

## 6.4 Service DNS

Compose สร้าง network ให้ 1 วง (`app_default`) และทุก service ได้ชื่อ DNS ตามชื่อ service

```powershell
docker network ls                           # เห็น app_default
docker compose exec api nslookup db         # Name: db  Address: 172.x.x.x
docker compose exec api wget -qO- http://localhost:3000/api/health
```

| จากที่ไหน | เรียก api ด้วย |
|---|---|
| container อื่นใน compose เดียวกัน | `http://api:3000` |
| เครื่องเรา (browser, PowerShell) | `http://localhost:3000` (ผ่าน `ports:`) |

> ภายใน network ไม่ต้อง publish port — db ไม่มี `ports:` เลย คนนอกจึงต่อ database ไม่ได้ (ดีแล้ว)

## 6.5 `.env` — เอารหัสผ่านออกจากไฟล์ที่ commit

สร้าง `app/.env`:

```powershell
Set-Content .env "POSTGRES_PASSWORD=secret", "WEB_PORT=8080", "API_PORT=3000"
```

แก้ `compose.yaml` ให้อ่านค่าจาก `.env`:

```yaml
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?ตั้งค่าใน .env}
      ...
      DATABASE_URL: postgres://todo:${POSTGRES_PASSWORD}@db:5432/todo
    ports:
      - "${API_PORT:-3000}:3000"
```

```powershell
docker compose config      # ดูไฟล์หลังแทนค่าแล้ว
```

ลองเปลี่ยนชื่อ `.env` เป็นอย่างอื่นแล้วรัน `docker compose config` อีกครั้ง:

```
required variable POSTGRES_PASSWORD is missing a value: ตั้งค่าใน .env
```

| รูปแบบ | ความหมาย |
|---|---|
| `${VAR}` | ใช้ค่า VAR (ว่างถ้าไม่มี) |
| `${VAR:-8080}` | ไม่มีค่า → ใช้ 8080 |
| `${VAR:?ข้อความ}` | ไม่มีค่า → **หยุด** พร้อมข้อความ |

> `.env` อยู่ใน `.gitignore` แล้ว — commit `.env.example` ที่ไม่มีรหัสจริงแทน

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `docker compose up -d --build` | build (ถ้าจำเป็น) แล้ว start ทุก service |
| `docker compose ps` | สถานะ + health |
| `docker compose logs -f api` | ดู log ต่อเนื่อง (Ctrl+C ออก) |
| `docker compose exec api sh` | เข้าไปใน container |
| `docker compose restart api` | restart ตัวเดียว |
| `docker compose down` | ลบ container + network (**volume ยังอยู่**) |
| `docker compose down -v` | ลบ volume ด้วย (ข้อมูลหาย) |

## 🧹 ก่อนไป Lab 7

```powershell
docker compose down
```
