# project_reg_sync (SUT Course Viewer & Sync)

ระบบดึงรายวิชาที่เปิดสอนจากระบบบริการการศึกษา มหาวิทยาลัยเทคโนโลยีสุรนารี (REG มทส.) เก็บใน PostgreSQL และแสดงผลผ่านหน้าเว็บสไตล์ Google Sheets พร้อมฟิลเตอร์แยกตามเทอม

```
Go (SUT REG Scraper) → PostgreSQL → Gin REST API → React + Vite (Google Sheets UI)
```

---

## 🚀 เริ่มใช้งาน (ผ่าน Docker Compose)

1. ตรวจสอบการตั้งค่าใน `backend/.env`
2. เริ่มระบบ:
   ```bash
   docker compose up --build -d
   ```
3. เปิดเบราว์เซอร์: [http://localhost:3000](http://localhost:3000)
4. ดู Log การดึงข้อมูล:
   ```bash
   docker compose logs -f backend
   ```

---

## ⚙️ การตั้งค่า Scraper (`backend/.env`)

| Parameter | ค่าเริ่มต้น | รายละเอียด |
| :--- | :--- | :--- |
| `SCRAPE_POST_URL` | `https://reg2.sut.ac.th/registrar/class_info_1.asp?...` | URL ปลายทางสำหรับค้นหารายวิชา (POST) |
| `SCRAPE_COURSE_PREFIXES` | `ENG23*,ENG20*` | รหัสวิชาที่ต้องการดึง (`ENG23*` = คอมพิวเตอร์, `ENG20*` = โครงงาน PBL) |
| `SCRAPE_YEARS` | `2567,2568` | ปีการศึกษาที่ต้องการดึง |
| `SCRAPE_SEMESTERS` | `1,2,3` | เทอมที่ต้องการดึง (มทส. มี 3 ภาคการศึกษา) |
| `SCRAPE_INTERVAL_MIN` | `30` | ความถี่ในการดึงข้อมูลอัตโนมัติ (นาที) |

---

## ⚡ สั่งดึงข้อมูลทันที (Manual Trigger)

```bash
curl -X POST -H "X-Admin-Token: change-me" http://localhost:8080/api/scrape
```

---

## 💻 รันแบบ Development (ไม่ใช้ Docker)

1. **Database:**
   ```bash
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=subjects postgres:16-alpine
   ```
2. **Backend:**
   ตั้ง `DB_HOST=localhost` ใน `backend/.env` แล้วรัน:
   ```bash
   cd backend
   go run ./cmd
   ```
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
