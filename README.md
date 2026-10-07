# 🎓 project_reg_sync (SUT CPE Course Viewer & REG Sync)

ระบบแสดงผลรายวิชาเลือกสาขาวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีสุรนารี (มทส.) พร้อมระบบดึงข้อมูลอัตโนมัติ (Web Scraper) จากระบบบริการการศึกษา (REG มทส.) สไตล์ Caesar Cluster & Google Sheets UI

🌐 **หน้าเว็บออนไลน์ (Live Website):** [https://bisket77.github.io/project_reg_sync/](https://bisket77.github.io/project_reg_sync/)

---

## 🏗️ โครงสร้างของโปรเจกต์ (Project Structure)

```text
project_reg_sync/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD (รัน Scraper + Deploy GitHub Pages วันละ 1 ครั้ง)
│
├── backend/                        # ฝั่ง Go Backend & Scraper Engine
│   ├── cmd/
│   │   ├── main.go                 # Entry point สำหรับรันเป็น REST API Web Server (Gin Framework)
│   │   └── sync/
│   │       └── main.go             # Standalone CLI Scraper สำหรับรันบน GitHub Actions เพื่อสร้าง courses.json
│   ├── internal/
│   │   ├── config/
│   │   │   ├── config.go           # จัดการ Environment Variables (URLs, Prefixes, ช่วงเวลา)
│   │   │   └── db.go               # การเชื่อมต่อ PostgreSQL ด้วย GORM
│   │   ├── controllers/
│   │   │   └── course_controller.go# จัดการ REST API (/api/courses, /api/terms, /api/status, /api/scrape)
│   │   ├── middleware/
│   │   │   └── cors.go             # Middleware จัดการ Cross-Origin Resource Sharing (CORS)
│   │   ├── models/
│   │   │   └── course.go           # GORM Model สำหรับตาราง Course (รองรับ JSONB สำหรับ Raw Data)
│   │   ├── routes/
│   │   │   └── routes.go           # กำหนด Routing ของ Gin Engine
│   │   └── scraper/
│   │       └── scraper.go          # Core Scraper ส่ง HTTP POST ไป REG มทส., ถอดรหัส Windows-874 เป็น UTF-8
│   ├── .env.example                # ตัวอย่างการตั้งค่า Environment Variables
│   ├── Dockerfile                  # Multi-stage Docker build สำหรับ Go Backend
│   ├── go.mod                      # Go Module definition
│   └── go.sum                      # Go Checksum dependencies
│
├── frontend/                       # ฝั่ง Frontend (React 18 + Vite)
│   ├── public/
│   │   └── courses.json            # ฐานข้อมูลรายวิชาที่ Scrape ล่าสุดจาก REG มทส. (สำหรับ GitHub Pages)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CourseTable.jsx     # คอมโพเนนต์ตารางแสดงรายวิชา 2 ภาษา พร้อม Pill Badges สีตามเทอม
│   │   │   ├── Icons.jsx           # คลัง SVG Icons เวกเตอร์ทั้งหมด (Search, Refresh, Menu, Chevron, Dot)
│   │   │   └── SheetTabs.jsx       # แถบแท็บด้านล่างสไตล์ Google Sheets (ALL, เทอม 1, เทอม 2, เทอม 3)
│   │   ├── data/
│   │   │   └── electivesData.js    # Master Data รายวิชาเลือกวิศวะคอม 32 วิชาตามเล่มหลักสูตร
│   │   ├── pages/
│   │   │   └── HomePage.jsx        # หน้าหลัก จัดการการค้นหา, กรองข้อมูลตามเทอม, และซิงค์ข้อมูล
│   │   ├── services/
│   │   │   └── api.js              # Service สำหรับเรียก REST API และดึง courses.json
│   │   ├── App.jsx                 # Root React Component
│   │   ├── index.css               # สไตล์ชีตหลัก ธีม Caesar Cluster (Terracotta & Warm Cream)
│   │   └── main.jsx                # จุดเริ่มต้นการเรนเดอร์ React App
│   ├── Dockerfile                  # Docker build สำหรับ Frontend (Nginx Alpine)
│   ├── index.html                  # HTML template พร้อมฟอนต์ Google Fonts (Prompt & Sarabun)
│   ├── nginx.conf                  # Nginx configuration สำหรับ Reverse Proxy ไปยัง Backend
│   ├── package.json                # NPM Dependencies & Scripts
│   └── vite.config.js              # Vite config (ตั้ง base: './' สำหรับ GitHub Pages)
│
├── .gitignore                      # กำหนดไฟล์ที่ไม่ต้อง Commit (.env, node_modules, dist, etc.)
├── docker-compose.yml              # รวม Service ทั้งหมด (db + backend + frontend) สำหรับรันใน Docker
└── README.md                       # เอกสารประกอบโปรเจกต์
```

---

## ✨ ฟีเจอร์เด่นของระบบ (Features)

1. **ธีม Caesar Cluster (Terracotta & Warm Cream):**
   - โทนสีน้ำตาลอิฐ/ดินเผา (`#B95C44`) ผสมผสานกับพื้นหลังสีครีมอุ่น (`#FAF6EF`)
   - หน้าตาตารางสไตล์ Spreadsheet คมชัด สวยงาม สบายตา
2. **ระบบค้นหา Full-Width ใต้หัวเรื่อง:**
   - ช่องค้นหารหัสวิชาและชื่อวิชายาวเต็มหน้าตารางตามแนวขอบ พร้อมตัวนับจำนวนวิชา
   - ค้นหาได้ทั้งรหัสวิชา (เช่น `ENG23 3012`), ชื่อภาษาอังกฤษ และชื่อภาษาไทยแบบ Real-time
3. **Pill Badges แสดงเทอมที่เปิดสอน:**
   - 🟣 **เปิดทุกเทอม:** กลุ่มวิชาโครงงานบูรณาการ (PBL 1-3, GPBL 1-3)
   - 🟡 **เทอม 1:** วิชาเลือกที่เปิดสอนในภาคการศึกษาที่ 1
   - 🟢 **เทอม 2:** วิชาเลือกที่เปิดสอนในภาคการศึกษาที่ 2
   - 🔵 **เทอม 3:** วิชาเลือกที่เปิดสอนในภาคการศึกษาที่ 3
   - ⚪ **ไม่มีข้อมูล:** วิชาในหลักสูตรที่ยังไม่มีการเปิดสอนในรอบปีปัจจุบัน
4. **แถบนำทาง Google Sheets ด้านล่าง:**
   - สลับดูแท็บ `ALL`, `เทอม 1`, `เทอม 2`, `เทอม 3` ได้อย่างลื่นไหล
5. **ระบบไอคอนแบบ SVG 100%:**
   - ไม่มีอิโมจิ ทุกไอคอนเป็นเวกเตอร์ SVG คมชัด ไม่แตกบนทุกขนาดหน้าจอ
6. **รันอัตโนมัติ 100% บน GitHub:**
   - ทำงานผ่าน GitHub Actions ตื่นขึ้นมาดึงข้อมูลจากเว็บ REG มทส. วันละ 1 ครั้ง และอัปเดตหน้าเว็บให้อัตโนมัติ

---

## ⏰ การตั้งเวลาดึงข้อมูลอัตโนมัติ (Cron Schedule)

กำหนดไว้ใน `.github/workflows/deploy.yml` ด้วยรูปแบบ Cron Syntax:

```yaml
on:
  schedule:
    # รันอัตโนมัติวันละ 1 ครั้ง เวลา 00:00 น. (เที่ยงคืนเวลาไทย = 17:00 UTC)
    - cron: '0 17 * * *'
  workflow_dispatch: # กดปุ่มสั่งรันด้วยตัวเองได้ตลอดเวลา
```

> **สูตรคำนวณเวลาไทยเป็น UTC:** `เวลา UTC = เวลาไทยที่ต้องการ - 7 ชั่วโมง`
> - เที่ยงคืนไทย (00:00 น.): `0 17 * * *`
> - 6 โมงเช้าไทย (06:00 น.): `0 23 * * *`
> - เที่ยงวันไทย (12:00 น.): `0 5 * * *`

---

## 💻 วิธีการรันในเครื่อง (Local Development)

### ทางเลือกที่ 1: รันแบบ Docker Compose
```bash
docker compose up --build -d
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8080/api/courses](http://localhost:8080/api/courses)

### ทางเลือกที่ 2: รันเฉพาะ Frontend (โหมดดูข้อมูล / ทดสอบ UI)
```bash
cd frontend
npm install
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:5173](http://localhost:5173)

### ทางเลือกที่ 3: สั่ง Scrape ข้อมูลสดจาก REG มทส. ด้วยตัวเอง
```bash
cd backend
go run ./cmd/sync
```
ระบบจะดึงข้อมูลจริงจาก REG มทส. และบันทึกเป็น `frontend/public/courses.json` ให้ทันที
