# Lab 8 — CI: GitHub Actions → test → build → push GHCR (90 นาที)

> เป้าหมาย: ทุกครั้งที่ push โค้ด GitHub จะ test ให้ และถ้าผ่านจะ build image แล้วเก็บไว้ที่ **GHCR** (GitHub Container Registry)

```
git push ─▶ test (npm test) ─▶ build api + web ─▶ push ghcr.io/<user>/todo-cicd-api:<sha>
```

## 8.1 สร้าง repo ของตัวเอง

1. GitHub → **New repository** → ชื่อ `todo-cicd` → **Public** → ไม่ต้องติ๊ก README → Create
2. คัดลอกโฟลเดอร์ `app/` (ที่มี Dockerfile และ compose.yaml ของเราแล้ว) ออกมาเป็นโปรเจกต์ใหม่ — ไม่เอา `node_modules`

```powershell
cd docker-lesson-2569          # root ของ repo workshop
robocopy app ..\todo-cicd\app /E /XD node_modules dist
cp .gitignore ..\todo-cicd\
cd ..\todo-cicd

git init -b main
git add .
git status                     # ⚠️ ต้องไม่เห็น .env และ node_modules
git commit -m "Todo app with Docker Compose"
git remote add origin https://github.com/<user>/todo-cicd.git
git push -u origin main
```

> `robocopy` มีในทุก Windows · ถ้าใช้ macOS/Linux: `rsync -a --exclude node_modules --exclude dist app ../todo-cicd/`

## 8.2 Workflow แรก: test

สร้างไฟล์ `.github/workflows/ci-cd.yml` (ต้องอยู่ path นี้เป๊ะ):

```yaml
name: ci-cd

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app/api
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: app/api/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run build
```

```powershell
git add .github
git commit -m "CI: run tests"
git push
```

เปิดแท็บ **Actions** ใน GitHub → คลิก run → คลิก job `test` ดู log ทีละ step

| คำ | ความหมาย |
|---|---|
| workflow | ไฟล์ yml 1 ไฟล์ |
| `on:` | เหตุการณ์ที่ทำให้รัน (push, pull_request, …) |
| job | กลุ่มงานที่รันบนเครื่องใหม่ 1 เครื่อง (runner) — job ต่าง ๆ รัน**พร้อมกัน**ถ้าไม่มี `needs:` |
| step | คำสั่ง (`run:`) หรือ action สำเร็จรูป (`uses:`) |

## 8.3 ทำให้ test พัง (ตั้งใจ)

แก้ `app/api/test/app.test.ts` บรรทัดแรกของ test `reports health` ให้คาดหวังผิด เช่น `expect(res.status).toBe(500)` แล้ว push

→ เห็น ❌ สีแดง + อีเมลแจ้งเตือน → อ่าน log หาบรรทัดที่พัง → แก้กลับแล้ว push → ✅

> นี่คือหัวใจของ CI: **โค้ดที่ test ไม่ผ่านจะไม่ไปต่อ**

## 8.4 Build แล้ว push image ขึ้น GHCR

เพิ่ม job `build` ต่อจาก `test` (ระวังย่อหน้า — `build:` ต้องตรงกับ `test:`):

```yaml
  build:
    needs: test                 # รอ test ผ่านก่อน
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write           # ให้ GITHUB_TOKEN push ขึ้น GHCR ได้
    strategy:
      matrix:
        service: [api, web]     # แตกเป็น 2 job รันพร้อมกัน
    steps:
      - uses: actions/checkout@v7
      - id: image
        # ชื่อ image ต้องเป็นตัวพิมพ์เล็ก: ghcr.io/<owner>/<repo>-api
        run: echo "name=ghcr.io/${GITHUB_REPOSITORY,,}-${{ matrix.service }}" >> "$GITHUB_OUTPUT"
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        if: github.event_name == 'push'
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v7
        with:
          context: app/${{ matrix.service }}
          push: ${{ github.event_name == 'push' }}
          tags: |
            ${{ steps.image.outputs.name }}:${{ github.sha }}
            ${{ steps.image.outputs.name }}:latest
          cache-from: type=gha,scope=${{ matrix.service }}
          cache-to: type=gha,mode=max,scope=${{ matrix.service }}
```

push แล้วรอ ~1–2 นาที → หน้า repo ด้านขวา **Packages** จะมี `todo-cicd-api` และ `todo-cicd-web`

ลอง pull image ที่ CI build มารันบนเครื่องเรา:

```powershell
docker pull ghcr.io/<user>/todo-cicd-api:latest
docker run --rm -p 3001:3000 ghcr.io/<user>/todo-cicd-api:latest
```

### ทำไม tag 2 อัน?

| tag | ใช้ทำอะไร |
|---|---|
| `:<git sha>` เช่น `:e4084af…` | **ไม่เปลี่ยนตลอดไป** — รู้ว่า image นี้มาจาก commit ไหน, rollback ได้ |
| `:latest` | สะดวกตอนลองเล่น แต่ชี้ไปที่อันล่าสุดเสมอ — ห้ามใช้ deploy จริง |

### ทำไมรันรอบ 2 เร็วขึ้น?

`cache-from/cache-to: type=gha` เก็บ layer cache ไว้ที่ GitHub — หลักเดียวกับ layer cache ใน Lab 3
(ลองดู log: step `npm ci` ขึ้น `CACHED`)

## 8.5 ⭐ Pull Request

```powershell
git switch -c feature/new-title
# แก้ TITLE ใน app/web/src/App.tsx
git commit -am "Change title"
git push -u origin feature/new-title
```

เปิด Pull Request บน GitHub → เห็น check รันอัตโนมัติ → build แต่ **ไม่ push** (`push: ${{ github.event_name == 'push' }}`) → Merge แล้วดู run บน `main`

## ✅ Checkpoint

- [ ] แท็บ Actions มี run สีเขียว ✅ ที่มี job `test`, `build (api)`, `build (web)`
- [ ] Packages มี image 2 ตัว tag เป็น git sha
- [ ] `docker pull ghcr.io/<user>/todo-cicd-api:latest` ได้
