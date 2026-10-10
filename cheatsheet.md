# Docker Cheatsheet

## Container
| คำสั่ง | ทำอะไร |
|---|---|
| `docker run -d --name NAME -p HOST:CTR IMAGE` | รันเบื้องหลัง + map port |
| `docker run -it --rm IMAGE sh` | เข้า shell แล้วลบทิ้งเมื่อออก |
| `docker run -e KEY=VAL --env-file .env IMAGE` | ส่ง environment variable |
| `docker run -v VOLUME:/path IMAGE` | named volume |
| `docker run -v "${PWD}/dir:/path" IMAGE` | bind mount |
| `docker ps` / `docker ps -a` | ดูที่รันอยู่ / ทั้งหมด |
| `docker logs -f NAME` | ดู log แบบ real-time |
| `docker exec -it NAME sh` | เข้าไปใน container ที่รันอยู่ |
| `docker inspect NAME` | ดูรายละเอียด (JSON) |
| `docker stop` / `start` / `restart NAME` | lifecycle |
| `docker rm -f NAME` | หยุด + ลบ |

## Image
| คำสั่ง | ทำอะไร |
|---|---|
| `docker build -t NAME:TAG .` | build จาก Dockerfile ในโฟลเดอร์ปัจจุบัน |
| `docker build -f Dockerfile.dev -t NAME:dev .` | ระบุชื่อ Dockerfile |
| `docker build --target build .` | build ถึงแค่ stage ที่กำหนด |
| `docker images` | ดู image ทั้งหมด |
| `docker history NAME:TAG` | ดู layer |
| `docker tag SRC USER/NAME:TAG` | ตั้งชื่อใหม่เพื่อ push |
| `docker login` / `docker push USER/NAME:TAG` | ขึ้น registry |
| `docker rmi NAME:TAG` | ลบ image |

## Volume / Network / ทำความสะอาด
| คำสั่ง | ทำอะไร |
|---|---|
| `docker volume ls` / `create` / `rm` | จัดการ volume |
| `docker network create NET` / `docker run --network NET` | user-defined network (เรียกกันด้วยชื่อได้) |
| `docker system df` | ดูพื้นที่ที่ใช้ |
| `docker system prune` | ลบของที่ไม่ใช้ (`-a` = ลบ image ที่ไม่ได้ใช้ด้วย) |

## Dockerfile
```dockerfile
FROM node:24-alpine AS build      # base image (+ ตั้งชื่อ stage)
WORKDIR /app                      # cd (สร้างให้ถ้าไม่มี)
COPY package*.json ./             # copy จาก build context
RUN npm ci                        # รันตอน build → สร้าง layer
COPY . .
ENV NODE_ENV=production           # env ค่า default
EXPOSE 3000                       # เอกสาร: แอปใช้ port นี้
USER node                         # อย่ารันด้วย root
HEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]    # คำสั่งตอน container เริ่ม (exec form)
```
