# วันที่ 2 — Compose → CI/CD

🚧 เนื้อหา lab กำลังเตรียม — ไฟล์ที่ทดสอบแล้วอยู่ใน `solutions/day2/`

- `compose.yaml` — web + api + db พร้อม healthcheck และ named volume (ทดสอบแล้วบน Compose v5)
- `ci-cd.yml` — GitHub Actions: test → build & push GHCR → deploy ผ่าน SSH (**ฉบับร่าง ยังไม่ได้รันบน GitHub จริง**)
