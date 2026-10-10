# 1) เริ่มจาก image ที่มี Node.js อยู่แล้ว
FROM node:24-alpine

# 2) โฟลเดอร์ทำงานใน container (สร้างให้อัตโนมัติ)
WORKDIR /app

# 3) คัดลอกโค้ดจากเครื่องเรา (build context) เข้าไปใน image
COPY server.js .

# 4) ค่า default ของ environment variable — override ได้ด้วย docker run -e
ENV PORT=3000

# 5) บอกว่าแอป listen port ไหน (เป็นเอกสาร — ไม่ได้เปิด port จริง)
EXPOSE 3000

# 6) คำสั่งที่รันเมื่อ container เริ่มทำงาน
CMD ["node", "server.js"]
