# Lab 4 — Data: Volumes, Bind Mounts, Environment (75 นาที)

> เป้าหมาย: เข้าใจว่าข้อมูลใน container หายเมื่อไร และเก็บให้รอดได้อย่างไร

## 4.1 ข้อมูลหายไปกับ container

```bash
docker run -d --name api -p 3000:3000 todo-api:1.0
curl -X POST localhost:3000/api/todos -H "Content-Type: application/json" -d '{"title":"จะหายไหม?"}'
docker rm -f api
docker run -d --name api -p 3000:3000 todo-api:1.0
curl localhost:3000/api/todos       # [] — หายหมด
docker rm -f api
```

> ไฟล์ที่เขียนใน container อยู่ใน **writable layer** ของ container นั้น ลบ container = ลบข้อมูล

## 4.2 Named Volume — ให้ Docker จัดการพื้นที่เก็บข้อมูล

```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql postgres:18-alpine

docker exec -it db psql -U postgres
#   CREATE TABLE notes (msg text);
#   INSERT INTO notes VALUES ('ยังอยู่ไหม?');
#   \q

docker rm -f db                       # ลบ container ทิ้ง
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql postgres:18-alpine
docker exec db psql -U postgres -c "SELECT * FROM notes"   # ยังอยู่ ✅

docker volume ls
docker volume inspect pgdata
```

> ⚠️ **Postgres 18 เปลี่ยน path** — ใช้ `/var/lib/postgresql` (บทความเก่าจะเขียน `/var/lib/postgresql/data`)
> PowerShell: เปลี่ยน `\` ท้ายบรรทัดเป็น `` ` `` หรือพิมพ์ให้อยู่บรรทัดเดียว

## 4.3 Bind Mount — เอาโฟลเดอร์ในเครื่องเราไปวางใน container

```bash
cd labs/day1/04-data
docker run -d --name site -p 8080:80 \
  -v "${PWD}/site:/usr/share/nginx/html:ro" nginx:1.29-alpine
```

เปิด <http://localhost:8080> → แก้ `site/index.html` → refresh → เปลี่ยนทันที ไม่ต้อง build

> `${PWD}` ใช้ได้ทั้ง bash และ PowerShell · `:ro` = read-only (container แก้ไฟล์เราไม่ได้)

| | Named Volume | Bind Mount |
|---|---|---|
| ใครจัดการ | Docker | เรา (path ในเครื่อง) |
| เหมาะกับ | ข้อมูล database, production | แก้โค้ดระหว่าง development |
| ตัวอย่าง | `-v pgdata:/var/lib/postgresql` | `-v "${PWD}/site:/usr/share/nginx/html"` |

## 4.4 Environment variables & `--env-file`

```bash
printf "POSTGRES_PASSWORD=secret\nPOSTGRES_DB=todo\n" > db.env
docker run -d --name db2 --env-file db.env postgres:18-alpine
docker exec db2 env | grep POSTGRES
```

> ไฟล์ `.env` / `db.env` มีรหัสผ่าน → ต้องอยู่ใน `.gitignore` เสมอ
> ห้ามใส่ secret ใน Dockerfile (`ENV PASSWORD=...`) เพราะ `docker history` อ่านได้

## 🧹 ทำความสะอาด

```bash
docker rm -f db db2 site
docker volume rm pgdata
```
