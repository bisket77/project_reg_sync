# 🎓 project_reg_sync (SUT CPE Course Viewer & REG Sync)

ระบบแสดงผลรายวิชาและผังโครงสร้างหลักสูตรวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีสุรนารี (มทส.) พร้อมระบบดึงข้อมูลอัตโนมัติ (Web Scraper) จากระบบบริการการศึกษา (REG มทส.) และระบบคำนวณผลการเรียน

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
│   │   │   ├── auth_controller.go  # จัดการ Authentication (Login, Register, Bearer Token)
│   │   │   ├── course_controller.go# จัดการ REST API (/api/courses, /api/terms, /api/status, /api/scrape)
│   │   │   └── grade_controller.go # จัดการ REST API ระบบเกรด (Scores, Criteria, Calculations)
│   │   ├── middleware/
│   │   │   └── cors.go             # Middleware จัดการ Cross-Origin Resource Sharing (CORS)
│   │   ├── models/
│   │   │   ├── course.go           # GORM Model สำหรับตาราง Course (รองรับ JSONB สำหรับ Raw Data)
│   │   │   └── grade_models.go     # GORM Models สำหรับระบบคำนวณเกรด
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
│   │   │   ├── AppHeader.jsx       # แถบ Header หลักด้านบน แสดงสถานะระบบและการเข้าสู่ระบบ
│   │   │   ├── CourseTable.jsx     # คอมโพเนนต์ตารางแสดงรายวิชา 2 ภาษา พร้อม Pill Badges สีตามเทอม
│   │   │   ├── Icons.jsx           # คลัง SVG Icons เวกเตอร์ทั้งหมด
│   │   │   ├── LoginModal.jsx      # หน้าต่างเข้าสู่ระบบสำหรับ Admin
│   │   │   ├── SheetTabs.jsx       # แถบแท็บด้านล่างสำหรับเลือกเทอม (ALL, เทอม 1, เทอม 2, เทอม 3)
│   │   │   └── Sidebar.jsx         # เมนูแถบข้างนำทางระหว่างระบบดูวิชา, ผังโครงสร้าง และระบบคำนวณเกรด
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Context จัดการ State การล็อกอินและสิทธิ์ Admin
│   │   ├── data/
│   │   │   ├── coreCoursesData.js        # รายวิชาชีพบังคับตามเล่มหลักสูตร
│   │   │   ├── cpeCurriculum2567Data.js  # โครงสร้างหลักสูตร CPE 2565 / ปรับปรุง 2567 แยก 4 ปี 12 เทอม
│   │   │   ├── electivesData.js          # รายวิชาเลือกวิศวกรรมคอมพิวเตอร์ 32 วิชา
│   │   │   ├── freeElectivesData.js      # รายวิชาเลือกเสรี
│   │   │   ├── geElectivesData.js        # รายวิชาศึกษาทั่วไปแบบเลือก
│   │   │   └── initialGradeData.js       # ข้อมูลเริ่มต้นระบบคะแนนและเกณฑ์ตัดเกรด
│   │   ├── pages/
│   │   │   ├── grade/              # ระบบคำนวณเกรด มทส. (TOTAL, CALCULATOR, PROGRAM GRADE)
│   │   │   │   ├── GradeCalculatorPage.jsx
│   │   │   │   ├── GradeEntryPage.jsx
│   │   │   │   └── GradeReportPage.jsx
│   │   │   ├── CurriculumStructurePage.jsx # ผังโครงสร้างหลักสูตรแบบ Flowchart และตารางเรียน
│   │   │   └── HomePage.jsx        # หน้าหลักดูรายวิชา ค้นหา กรองตามเทอม และซิงค์ข้อมูล
│   │   ├── services/
│   │   │   └── api.js              # Service สำหรับเรียก REST API และดึง courses.json
│   │   ├── App.jsx                 # Root React Component พร้อมจัดการ Routing
│   │   ├── index.css               # สไตล์ชีตหลัก ธีม Bisket Core
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

### 1. ผังโครงสร้างหลักสูตรแบบโต้ตอบ (Interactive Curriculum Flowchart)
- **แสดงผังโครงสร้าง 4 ชั้นปี 12 ภาคการศึกษา:** อ้างอิงตามหลักสูตรวิศวกรรมคอมพิวเตอร์ มทส. (ปี 2565 / ปรับปรุง 2567) พร้อมแถบสีแยกตามกลุ่มวิชา
- **ระบบเส้นเชื่อมโยงวิชาบังคับก่อน (Pre-requisites):**
  - ลากเส้นฉาก (Orthogonal Rounded Paths) อัตโนมัติระหว่างวิชาต้นทางและปลายทาง
  - เส้นเดินผ่านเฉพาะช่องว่างระหว่างบล็อกวิชา ไม่ทับซ้อนหรือวิ่งผ่านหลังการ์ดวิชา
  - ระบบแยกเส้น 1 ต่อหลาย (One-to-Many Routing): มีจุดรวม (Hub) ก่อนแยกไปยังวิชาเป้าหมายอย่างเป็นระเบียบ
  - รองรับการปรับดัดมุมโค้งของเส้นได้อย่างอิสระ พร้อมจุดจับดัด (Drag Handle)
  - คลิกที่เส้นเชื่อมโยงเพื่อเปิด Popover แสดงรายละเอียดความสัมพันธ์ และสามารถกดลบเส้นได้
- **Spotlight Focus เมื่อชี้วิชา:**
  - ชี้เมาส์ที่วิชาใด จะไฮไลต์วิชาบังคับก่อน (ต้นทาง) เป็นกรอบสีแดงพร้อมเอฟเฟกต์กระพริบ
  - ไฮไลต์วิชาต่อเนื่อง (ตัวต่อ / วิชาที่ต้องใช้วิชานี้) เป็นกรอบสีเขียวพร้อมเอฟเฟกต์กระพริบ
  - ลดความทึบของวิชาอื่นๆ ที่ไม่เกี่ยวข้องให้อ่อนลง (Dimming/Transparent) เพื่อให้อ่านสายวิชาได้ชัดเจน
- **กล่องวิชาที่ปรับขนาดให้อ่านง่าย:**
  - ปรับขนาดฟอนต์รหัสวิชา (12px), ชื่อภาษาอังกฤษ (11px), ชื่อภาษาไทย (10px) และหน่วยกิตให้คมชัด
  - สัดส่วนกล่อง 98px รองรับข้อความยาวได้ 2 บรรทัด สระและวรรณยุกต์ภาษาไทยแสดงครบถ้วน
- **โหมดแก้ไขโครงสร้าง (Admin Edit Mode):**
  - ลากและวาง (Drag & Drop) เพื่อสลับหรือย้ายวิชาข้ามเทอมและข้ามชั้นปี
  - ค้นหาและดึงข้อมูลวิชาอัตโนมัติ (Auto-fill) จากฐานข้อมูล REG มทส. มากกว่า 490 วิชา
  - เพิ่มวิชาใหม่ ลบวิชา และล้างข้อมูลในแบบฟอร์มได้อย่างสะดวก
  - ปุ่มโหมดแก้ไขและปุ่มยกเลิกอยู่ในตำแหน่งเดิม ไม่เลื่อนขยับ

### 2. ตารางเรียนแต่ละเทอม (Term Timetable View)
- แสดงตารางเรียนของแต่ละชั้นปีและแต่ละภาคการศึกษา
- เชื่อมโยงข้อมูลรายวิชากับโครงสร้างหลักสูตรแบบ Real-time

### 3. ระบบแสดงผลรายวิชาและค้นหา (Course Viewer)
- ค้นหารหัสวิชาและชื่อวิชายาวเต็มหน้าตาราง พร้อมตัวนับจำนวนวิชา
- รองรับการค้นหาแบบ Wildcard (`*`)
- Pill Badges แสดงสถานะเทอมที่เปิดสอน (เทอม 1, 2, 3 หรือเปิดทุกเทอม)
- แถบนำทางด้านล่างสำหรับกรองตามเทอม

### 4. ระบบคำนวณเกรด มทส. (Bisket Core Grade Calculator)
- **TOTAL (บันทึกคะแนนเก็บ):** บันทึกคะแนนเก็บย่อย เพิ่ม/ลบคอลัมน์คะแนน คำนวณผลรวมคะแนนเก็บอัตโนมัติ พร้อมวิเคราะห์แต้มที่ต้องการสำหรับเกรด A
- **CALCULATOR (เกณฑ์ตัดเกรด):** จัดการเกณฑ์ตัดเกรดตามรายวิชา ปรับช่วงคะแนนและค่า CX พร้อมเครื่องมือ Simulator จำลองผลคะแนน
- **PROGRAM GRADE (รายงานผลการเรียน):** สรุปผลการเรียนแยกตามชั้นปีและเทอม คำนวณ GPA และ GPAX สะสม พร้อมฟีเจอร์ HOPE Grade สำหรับวางแผนเกรดล่วงหน้า

### 5. การทำงานและสถาปัตยกรรมระบบ
- **SVG 100%:** ไม่ใช้อิโมจิในคอมโพเนนต์หลัก ทุกไอคอนเป็น SVG เวกเตอร์คมชัด
- **ดึงข้อมูลอัตโนมัติบน GitHub:** ทำงานผ่าน GitHub Actions ตื่นขึ้นมา Scrape ข้อมูลจากระบบ REG มทส. วันละ 1 ครั้ง และอัปเดตหน้าเว็บให้อัตโนมัติ

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
