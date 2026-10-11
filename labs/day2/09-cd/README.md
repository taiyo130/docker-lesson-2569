# Lab 9 — CD: deploy ขึ้น server ผ่าน SSH (75 นาที)

> เป้าหมาย: push เข้า `main` แล้วเว็บ `https://stdNN.cpedev.cloud` อัปเดตเองภายใน ~3 นาที

```
GitHub Actions ──ssh :50NN──▶ stdNN (Docker) ── docker compose pull + up
                                    ▲
Browser ─▶ https://stdNN.cpedev.cloud ─▶ nginx ─▶ stdNN:8080 (web)
           https://api-stdNN.cpedev.cloud ─▶       stdNN:3000 (api)
```

ผู้สอนแจกการ์ด: **NN** (เลขของเรา), **password** · server `76.13.177.240` · user `student`

| ของเรา | ค่า |
|---|---|
| SSH | `ssh -p 50NN student@76.13.177.240` (std07 → `-p 5007`) |
| เว็บ | `https://stdNN.cpedev.cloud` |
| API | `https://api-stdNN.cpedev.cloud/api/info` |

## 9.1 เข้า server ครั้งแรก

```powershell
ssh -p 50NN student@76.13.177.240
```

ตอบ `yes` ครั้งแรก → ใส่ password (พิมพ์แล้วไม่ขึ้นตัวอักษร เป็นเรื่องปกติ)

```bash
docker ps          # server นี้มี Docker แล้ว (เป็น LXC container ของเราคนเดียว)
passwd             # ⭐ เปลี่ยน password เป็นของตัวเอง
```

> ตั้งแต่ตรงนี้ คำสั่งในกล่อง `bash` รัน**บน server** · กล่อง `powershell` รันบนเครื่องเรา

## 9.2 สร้าง SSH key ให้ GitHub Actions

GitHub ต้องเข้า server ได้โดยไม่ต้องพิมพ์ password → ใช้ key คู่หนึ่ง:
**public key** วางบน server · **private key** เก็บเป็น secret ใน GitHub

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy -N "" -C github-actions
cat ~/.ssh/deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/deploy           # คัดลอกทั้งหมด ตั้งแต่ -----BEGIN ถึง END-----
```

## 9.3 เตรียมไฟล์ `.env` บน server (ครั้งเดียว)

```bash
mkdir -p ~/todo
printf 'POSTGRES_PASSWORD=%s\nWEB_PORT=8080\nAPI_PORT=3000\n' "$(openssl rand -hex 16)" > ~/todo/.env
cat ~/todo/.env
```

> ต้องเป็น **8080** และ **3000** — nginx ของ server ส่ง `stdNN.cpedev.cloud` มาที่ port 8080 และ `api-stdNN` มาที่ 3000
> รหัส database อยู่บน server เท่านั้น ไม่อยู่ใน git และไม่อยู่ใน GitHub

## 9.4 ตั้งค่า GitHub

repo `todo-cicd` → **Settings → Secrets and variables → Actions**

**Secrets** (แท็บ Secrets → New repository secret):

| Name | Value |
|---|---|
| `SSH_KEY` | private key จาก 9.2 (ทั้งก้อน) |

**Variables** (แท็บ Variables → New repository variable):

| Name | Value |
|---|---|
| `DEPLOY_HOST` | `76.13.177.240` |
| `DEPLOY_PORT` | `50NN` |
| `DEPLOY_USER` | `student` |
| `APP_URL` | `https://stdNN.cpedev.cloud` |

> Secret: อ่านกลับไม่ได้ และถูกปิดเป็น `***` ใน log · Variable: ค่าธรรมดาที่ไม่ลับ

## 9.5 เพิ่ม job deploy

เพิ่มต่อท้าย `.github/workflows/ci-cd.yml`:

```yaml
  deploy:
    needs: build
    if: github.event_name == 'push' && vars.DEPLOY_HOST != ''
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      packages: read
    env:
      HOST: ${{ vars.DEPLOY_HOST }}
      PORT: ${{ vars.DEPLOY_PORT || '22' }}
      USER: ${{ vars.DEPLOY_USER }}
    steps:
      - uses: actions/checkout@v7
      - name: Setup SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -p "$PORT" "$HOST" >> ~/.ssh/known_hosts
      - name: Copy compose.yaml
        run: |
          ssh -p "$PORT" "$USER@$HOST" "mkdir -p ~/todo && test -f ~/todo/.env || { echo 'ไม่พบ ~/todo/.env บน server'; exit 1; }"
          scp -P "$PORT" app/compose.yaml "$USER@$HOST:~/todo/compose.yaml"
      - name: Login GHCR on server
        run: echo "${{ secrets.GITHUB_TOKEN }}" | ssh -p "$PORT" "$USER@$HOST" "docker login ghcr.io -u '${{ github.actor }}' --password-stdin"
      - name: Deploy with docker compose
        run: |
          IMAGE="ghcr.io/${GITHUB_REPOSITORY,,}"
          ssh -p "$PORT" "$USER@$HOST" "
            set -e
            cd ~/todo
            export TAG='${{ github.sha }}' API_IMAGE='$IMAGE-api' WEB_IMAGE='$IMAGE-web'
            docker compose pull api web
            docker compose up -d --no-build --wait
            docker image prune -f
          "
      - name: Smoke test
        if: vars.APP_URL != ''
        run: |
          curl -fsS --retry 5 --retry-delay 3 "${{ vars.APP_URL }}/api/info" | tee info.json
          grep -q "${{ github.sha }}" info.json
```

push แล้วดูแท็บ Actions → job `deploy` เขียว → เปิด `https://stdNN.cpedev.cloud` 🎉
footer ต้องแสดง **version = git sha** ของ commit ล่าสุด

ดูบน server ว่าเกิดอะไรขึ้น:

```bash
cd ~/todo
docker compose ps
docker compose logs --tail 20 api
```

### อ่าน job deploy ทีละ step

| step | ทำอะไร |
|---|---|
| Setup SSH key | เขียน private key จาก secret ลงไฟล์ + จำ host key ของ server |
| Copy compose.yaml | ส่งไฟล์ compose ล่าสุดขึ้นไป (ไม่ส่งโค้ด — server ไม่ต้อง build) |
| Login GHCR | ส่ง token ทาง stdin ไม่ให้โผล่ใน command line |
| Deploy | `TAG=<sha>` → pull image ใหม่ → `up --wait` รอจน healthy |
| Smoke test | เรียกเว็บจริงจากข้างนอก และเช็กว่าเป็นเวอร์ชันที่เพิ่ง deploy |

## 9.6 วงจรเต็ม: แก้โค้ด → ขึ้น production

1. แก้ `TITLE` ใน `app/web/src/App.tsx`
2. `git commit -am "New title"` → `git push`
3. นับเวลาจาก push จนเห็นหน้าเว็บเปลี่ยน ⏱️

## 9.7 Rollback

deploy เวอร์ชันใหม่แล้วพัง? กลับไป image ของ commit ก่อนหน้า — ไม่ต้อง build ใหม่ เพราะ image ทุก sha ยังอยู่ใน GHCR

**วิธี 1 — บน server** (เร็วที่สุด):

```bash
cd ~/todo
TAG=<sha เก่า> API_IMAGE=ghcr.io/<user>/todo-cicd-api WEB_IMAGE=ghcr.io/<user>/todo-cicd-web \
  docker compose up -d --no-build --wait
curl -s localhost:3000/api/info      # version = sha เก่า · ข้อมูล todo ยังอยู่ (อยู่ใน volume)
```

**วิธี 2 — บน GitHub**: Actions → เลือก run เก่าที่เขียว → **Re-run all jobs** → deploy commit นั้นอีกครั้ง

**วิธี 3 — แบบ git**: `git revert HEAD` → `git push` → pipeline deploy โค้ดที่แก้กลับแล้ว (ทิ้งประวัติไว้ครบ)

## ✅ Checkpoint

- [ ] `https://stdNN.cpedev.cloud` เปิดได้ เพิ่ม todo ได้ footer แสดง `store: postgres`
- [ ] `https://api-stdNN.cpedev.cloud/api/info` ตอบ JSON
- [ ] push ครั้งใหม่ → เว็บเปลี่ยนเองโดยไม่ต้อง ssh
- [ ] rollback ได้อย่างน้อย 1 วิธี
