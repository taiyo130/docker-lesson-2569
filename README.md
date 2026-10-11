# Docker → CI/CD Workshop 2569 🐳

```
docker run -p 9000:9000 -p 9001:9001 -v ./minio/data:/data alpine/minio:RELEASE.2025-10-15T17-29-55Z server /data --console-address :9001
```

```
http://10.244.7.108:9001/api/v1/download-shared-object/aHR0cDovLzEyNy4wLjAuMTo5MDAwL3Rlc3QvZGF5MS1kb2NrZXItZnVuZGFtZW50YWxzLnBkZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUQ0V1U3MDEwWlZCRFlaTVJSVlZMJTJGMjAyNjEwMTAlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYxMDEwVDA3MTMwNVomWC1BbXotRXhwaXJlcz00MzIwMCZYLUFtei1TZWN1cml0eS1Ub2tlbj1leUpoYkdjaU9pSklVelV4TWlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaFkyTmxjM05MWlhraU9pSkVORmRWTnpBeE1GcFdRa1JaV2sxU1VsWldUQ0lzSW1WNGNDSTZNVGM1TVRZMU9UUTFNU3dpY0dGeVpXNTBJam9pYldsdWFXOWhaRzFwYmlKOS5GQkhib2JZWWcxNTBoamgyWnRpa01aNTZIRnI0VFdVNUNibGE5SEhnZER5STN1N0VBa2djZmNSQ1p5WUhyT0JNalZ1Y1ktaVdMSWVheGZlWlNfX2FyQSZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmdmVyc2lvbklkPW51bGwmWC1BbXotU2lnbmF0dXJlPWY5YTE4ZTljNDIwYThmMmQ2MmEzMmQ1MzhiNDFjMzkxYjYyZjc2NzMxOWM2ZWExMjRlMDFiYWExNTNmOGNmZTY
```

เอกสารและโค้ดประกอบการอบรม **Docker สู่ CI/CD** สำหรับนักศึกษาวิศวกรรมคอมพิวเตอร์ ชั้นปีที่ 3 (2 วัน · 14 ชั่วโมง)

แอปตัวอย่างที่ใช้ตลอด workshop คือ **Todo App**: React (Vite + TS) → Express (TS) → PostgreSQL

```
Browser ──▶ web (nginx + React) ──/api──▶ api (Express) ──▶ db (PostgreSQL)
```

## 📝 แบบทดสอบ

| | ทำเมื่อไร | ลิงก์ |
|---|---|---|
| **Pre-test** | ก่อนเริ่มอบรมวันที่ 1 | [ทำแบบทดสอบ](https://docs.google.com/forms/d/e/1FAIpQLSd1ajYXxDpUXLlsTU-VX1skWs66qNxj88Rk3CzsWeiCO9hlgg/viewform) |
| **Post-test** | หลังจบอบรมวันที่ 2 | [ทำแบบทดสอบ](https://docs.google.com/forms/d/e/1FAIpQLScT-ZWC_l7JcGwd1m92nBnial75mIpi0TkteexfwZCwTV8toQ/viewform) |

## เริ่มต้น

```powershell
git clone https://github.com/taiyo130/docker-lesson-2569.git
cd docker-lesson-2569
docker version
```

ต้องมี: Docker Desktop (หรือ Docker Engine + Compose v2), Git, VS Code, บัญชี GitHub และ Docker Hub

### 🪟 ใช้ Terminal อะไร

คำสั่งใน lab เขียนสำหรับ **PowerShell บน Windows** (เปิดผ่าน Windows Terminal หรือ terminal ใน VS Code)

- เปิด **Docker Desktop** ให้ไอคอนวาฬขึ้นก่อนทุกครั้ง ไม่งั้นจะเจอ `Cannot connect to the Docker daemon`
- ไม่แนะนำ **Git Bash** — มันแปลง path แบบ `/app` เป็น path ของ Windows ทำให้ `-v` พัง
- เรียก API ด้วย `irm` (Invoke-RestMethod) หรือเปิดใน browser · `curl` ใน PowerShell 5.1 ไม่ใช่ curl ตัวจริง ให้ใช้ `curl.exe`
- ขึ้นบรรทัดใหม่ในคำสั่งยาว ๆ ใช้ `` ` `` (backtick) · บน macOS/Linux ใช้ `\` แทน

## โครงสร้าง repo

```
app/                 แอป Todo (ยังไม่มี Dockerfile — นักศึกษาเขียนเองระหว่าง lab)
  api/               Express + TypeScript + Vitest
  web/               React + Vite + TypeScript
labs/day1/           แบบฝึกหัดวันที่ 1 (แต่ละ lab มี README)
labs/day2/           แบบฝึกหัดวันที่ 2
solutions/           เฉลย
cheatsheet.md        คำสั่งที่ใช้บ่อย
slides/              สไลด์ประกอบการสอน (PDF)
```

📑 สไลด์วันที่ 1: [slides/day1-docker-fundamentals.pdf](slides/day1-docker-fundamentals.pdf)  
📑 สไลด์วันที่ 2: [slides/day2-compose-cicd.pdf](slides/day2-compose-cicd.pdf)

## วันที่ 1 — Docker Fundamentals

| เวลา | หัวข้อ | Lab |
|---|---|---|
| 09:00–09:45 | Intro: ปัญหา "It works on my machine", VM vs Container, Architecture | — |
| 09:45–10:30 | Docker CLI & Container Lifecycle | [Lab 1](labs/day1/01-cli) |
| 10:30–10:45 | ☕ พัก | |
| 10:45–12:00 | Dockerfile แรก: FROM / WORKDIR / COPY / ENV / CMD vs ENTRYPOINT | [Lab 2](labs/day1/02-first-dockerfile) |
| 12:00–13:00 | 🍚 พักกลางวัน | |
| 13:00–14:30 | Build อย่างมืออาชีพ: cache, `.dockerignore`, multi-stage, non-root, tag & push | [Lab 3](labs/day1/03-build-like-a-pro) |
| 14:30–14:45 | ☕ พัก | |
| 14:45–16:00 | Data: Volumes, Bind mounts, Environment variables | [Lab 4](labs/day1/04-data) |
| 16:00–17:00 | Mini-project: containerize React frontend | [Lab 5](labs/day1/05-mini-project) |

## วันที่ 2 — Compose → CI/CD

| เวลา | หัวข้อ | Lab |
|---|---|---|
| 09:00–10:30 | Docker Compose + Networking (service DNS, healthcheck, depends_on, `.env`) | [Lab 6](labs/day2/06-compose) |
| 10:30–10:45 | ☕ พัก | |
| 10:45–12:00 | Workshop: web + api + db ด้วย Compose | [Lab 7](labs/day2/07-fullstack) |
| 12:00–13:00 | 🍚 พักกลางวัน | |
| 13:00–14:30 | CI: GitHub Actions — test → build → push ขึ้น GHCR | [Lab 8](labs/day2/08-ci) |
| 14:30–14:45 | ☕ พัก | |
| 14:45–16:00 | CD: deploy ขึ้น server ผ่าน SSH (`stdNN.cpedev.cloud`) | [Lab 9](labs/day2/09-cd) |
| 16:00–17:00 | Security scanning, troubleshooting, ต่อยอด Kubernetes, Q&A | [Lab 10](labs/day2/10-security) |

ตัวอย่าง repo ตอนจบวันที่ 2 (deploy ขึ้น `std00.cpedev.cloud` จริง): [taiyo130/docker-lesson-2569-demo](https://github.com/taiyo130/docker-lesson-2569-demo)
Server สำหรับ CD: [`infra/server/`](infra/server)

## รันแอปทั้งชุด (เฉลยวันที่ 2)

```powershell
cp solutions/day1/web/Dockerfile, solutions/day1/web/nginx.conf.template, solutions/day1/web/.dockerignore app/web/
cp labs/day1/03-build-like-a-pro/Dockerfile, labs/day1/03-build-like-a-pro/.dockerignore app/api/
cp solutions/day2/compose.yaml, solutions/day2/.env.example app/
cd app
cp .env.example .env
docker compose up -d --build      # เปิด http://localhost:8080
```
