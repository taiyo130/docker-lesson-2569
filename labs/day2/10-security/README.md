# Lab 10 — Security Scanning, Troubleshooting, ต่อยอด Kubernetes (60 นาที)

## 10.1 สแกนช่องโหว่ด้วย Trivy

เพิ่ม step สุดท้ายใน job `build` (ต่อจาก `docker/build-push-action`):

```yaml
      - uses: aquasecurity/trivy-action@v0.36.0
        if: github.event_name == 'push'
        with:
          image-ref: ${{ steps.image.outputs.name }}:${{ github.sha }}
          severity: CRITICAL,HIGH
          ignore-unfixed: true      # แสดงเฉพาะที่มีเวอร์ชันแก้แล้ว
          exit-code: '0'            # ตอนนี้แค่รายงาน ยังไม่ทำให้ pipeline ล้ม
```

push แล้วเปิด log ของ step นี้ใน `build (api)` และ `build (web)` — ผลที่ผู้สอนได้ (11 ต.ค. 2569):

| image | HIGH | มาจากไหน |
|---|---|---|
| web | **44** | package ของ OS ใน `nginx:1.29-alpine` (Alpine 3.23: curl, libssl3, libxml2, tiff, …) |
| api | **7** | `npm` ที่ติดมากับ `node:24-alpine` (`tar`, `undici`, `brace-expansion`, …) |
| api (dependency ของแอปเรา) | 0 | — |

> ตัวเลขเปลี่ยนทุกวัน เพราะมีช่องโหว่ใหม่ประกาศทุกวัน — นี่คือเหตุผลที่ต้องสแกนใน CI ทุกครั้ง ไม่ใช่สแกนครั้งเดียว

## 10.2 แก้ให้เหลือ 0

**web** — อัปเดต package ของ OS ในชั้น nginx (`app/web/Dockerfile`):

```dockerfile
FROM nginx:1.29-alpine
# อัปเดต package ของ OS ที่มีช่องโหว่
RUN apk upgrade --no-cache
```

**api** — แอปรันด้วย `node dist/server.js` ไม่ได้ใช้ npm ตอนรัน → ลบทิ้งใน runtime stage (`app/api/Dockerfile` ก่อน `USER node`):

```dockerfile
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# npm ไม่ได้ใช้ตอนรัน — ลบทิ้งเพื่อลดช่องโหว่
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
```

แล้วเปลี่ยน `exit-code: '1'` → ต่อจากนี้ถ้าเจอ HIGH/CRITICAL **job build ล้ม และไม่ deploy**

> ผู้สอนทดสอบแล้ว: web 44 → 0, api 7 → 0
> ข้อสังเกต: step สแกนอยู่หลัง push → image ที่มีช่องโหว่ยังขึ้น GHCR ได้ แต่จะไม่ถูก deploy

**แนวคิดที่ใช้ได้กับทุกโปรเจกต์**

- image เล็ก = ของน้อย = ช่องโหว่น้อย (multi-stage, alpine/distroless, ลบเครื่องมือที่ไม่ใช้)
- อัปเดต base image สม่ำเสมอ (rebuild แม้โค้ดไม่เปลี่ยน)
- ไม่รันด้วย root (`USER node` จาก Lab 3)
- secret อยู่ใน GitHub Secrets / `.env` บน server — ไม่อยู่ใน image หรือ git

## 10.3 Troubleshooting — error ที่เจอจริงวันนี้

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| `api Exited (1)` + `ECONNREFUSED ...:5432` | api start ก่อน Postgres พร้อม | healthcheck + `condition: service_healthy` (Lab 6.3) |
| `required variable POSTGRES_PASSWORD is missing a value` | ไม่มี `.env` หรืออยู่ผิดโฟลเดอร์ | สร้าง `.env` ข้าง `compose.yaml` |
| `Bind for 0.0.0.0:8080 failed: port is already allocated` | มีอย่างอื่นใช้ port อยู่ (container เก่าจาก Lab 5?) | `docker ps` → ลบตัวเก่า หรือเปลี่ยน `WEB_PORT` |
| เว็บขึ้นแต่ todo หายทุกครั้งที่ deploy | db ไม่มี volume | `volumes: - pgdata:/var/lib/postgresql` |
| Actions: workflow ไม่รันเลย | ไฟล์ไม่อยู่ที่ `.github/workflows/` หรือ YAML ย่อหน้าผิด | ดู Actions tab มักมีข้อความ error ของ YAML |
| `denied: permission_denied: write_package` | ลืม `permissions: packages: write` | เพิ่มใน job `build` |
| `repository name must be lowercase` | ชื่อ user/repo มีตัวใหญ่ | ใช้ `${GITHUB_REPOSITORY,,}` (Lab 8) |
| `Permission denied (publickey)` | `SSH_KEY` ผิด / ไม่ครบก้อน / public key ไม่อยู่ใน `authorized_keys` | ทำ 9.2 ใหม่ คัดลอกทั้ง BEGIN–END |
| `ssh: connect to host ... port 22: Connection refused` | ไม่ได้ตั้ง `DEPLOY_PORT` | variable `DEPLOY_PORT=50NN` |
| `ไม่พบ ~/todo/.env บน server` | ข้ามขั้น 9.3 | สร้าง `.env` บน server |
| เว็บแสดง `ยังไม่มีแอปรันอยู่ (web ต้องเปิด port 8080 …)` | ยังไม่ deploy หรือ `WEB_PORT` ไม่ใช่ 8080 | ดู `.env` บน server · `docker compose ps` |
| Smoke test ล้มที่ `grep` | เว็บยังเป็นเวอร์ชันเก่า (`APP_VERSION` ไม่เปลี่ยน) | ดู `docker compose ps` บน server ว่า image tag เป็น sha ใหม่ไหม |

**ลำดับการหาสาเหตุ** — ไล่จากข้างนอกเข้าข้างใน:

```
Actions log ─▶ ssh เข้า server ─▶ docker compose ps ─▶ docker compose logs api ─▶ docker compose exec api sh
```

## 10.4 ต่อยอด: จาก Compose ไป Kubernetes

Compose เหมาะกับเครื่องเดียว — เมื่อมีหลายเครื่อง ต้องการ auto-scale หรือ zero-downtime deploy จึงใช้ **Kubernetes**
แนวคิดเกือบทั้งหมดที่เรียนมา 2 วันใช้ต่อได้:

| Compose | Kubernetes |
|---|---|
| `services: api:` | **Deployment** (จำนวน replica, rolling update) |
| ชื่อ service เป็น DNS | **Service** |
| `ports:` + nginx บน server | **Ingress** |
| `volumes: pgdata:` | **PersistentVolumeClaim** |
| `.env` | **Secret** / **ConfigMap** |
| `healthcheck:` | **readinessProbe** / **livenessProbe** |
| `docker compose up -d` | `kubectl apply -f k8s/` |

```yaml
# ตัวอย่าง: api 3 ตัว ใช้ image เดียวกับที่ CI ของเรา push
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
    spec:
      containers:
        - name: api
          image: ghcr.io/<user>/todo-cicd-api:<git sha>
          ports: [{ containerPort: 3000 }]
          readinessProbe:
            httpGet: { path: /api/health, port: 3000 }
```

อยากลองต่อเอง: เปิด **Kubernetes** ใน Docker Desktop (Settings → Kubernetes → Enable) หรือใช้ `kind` / `k3d`

## 📝 Post-test

[ทำแบบทดสอบหลังอบรม](https://docs.google.com/forms/d/e/1FAIpQLScT-ZWC_l7JcGwd1m92nBnial75mIpi0TkteexfwZCwTV8toQ/viewform)
