package seed

import (
	"log"

	"gorm.io/gorm"

	"project_see_subject/internal/models"
	"project_see_subject/internal/utils"
)

func SeedDatabase(db *gorm.DB) {
	// 1. Seed admin user
	var count int64
	db.Model(&models.User{}).Where("username = ?", "admin").Count(&count)
	var adminUser models.User
	if count == 0 {
		hash, err := utils.HashPassword("adminZ01")
		if err != nil {
			log.Printf("seed: error hashing admin password: %v", err)
			return
		}
		adminUser = models.User{
			Username:     "admin",
			PasswordHash: hash,
			Name:         "Administrator (Bisket Core)",
			Role:         "admin",
		}
		if err := db.Create(&adminUser).Error; err != nil {
			log.Printf("seed: error creating admin user: %v", err)
		} else {
			log.Println("seed: created default user admin:adminZ01")
		}
	} else {
		db.Where("username = ?", "admin").First(&adminUser)
		if hash, err := utils.HashPassword("adminZ01"); err == nil {
			db.Model(&adminUser).Update("password_hash", hash)
		}
	}

	// 2. Seed Default Scales if none exist
	var scaleCount int64
	db.Model(&models.GradeScale{}).Count(&scaleCount)
	if scaleCount == 0 {
		scales := []models.GradeScale{
			{
				ID:          "scale-std-80",
				UserID:      adminUser.ID,
				Name:        "เกณฑ์ทั่วไป / มาตรฐาน (A ที่ 80)",
				Description: "ตัดเกรด A ที่ 80 คะแนน ใช้สำหรับรายวิชาทั่วไปส่วนใหญ่ของ มทส.",
				IsDefault:   true,
				Ranges: []models.GradeRange{
					{Grade: "A", CX: 4.0, Min: 80, Max: 100},
					{Grade: "B+", CX: 3.5, Min: 75, Max: 79.99},
					{Grade: "B", CX: 3.0, Min: 70, Max: 74.99},
					{Grade: "C+", CX: 2.5, Min: 65, Max: 69.99},
					{Grade: "C", CX: 2.0, Min: 60, Max: 64.99},
					{Grade: "D+", CX: 1.5, Min: 55, Max: 59.99},
					{Grade: "D", CX: 1.0, Min: 50, Max: 54.99},
					{Grade: "F", CX: 0.0, Min: 0, Max: 49.99},
				},
			},
			{
				ID:          "scale-ln-75",
				UserID:      adminUser.ID,
				Name:        "LN, CN, FLAB, Physics II (A ที่ 75)",
				Description: "เกณฑ์ตัดเกรดหมวด LN, CN, วิชาปฏิบัติการ และ Physics II ตัด A ที่ 75",
				IsDefault:   false,
				Ranges: []models.GradeRange{
					{Grade: "A", CX: 4.0, Min: 75, Max: 100},
					{Grade: "B+", CX: 3.5, Min: 68, Max: 74.99},
					{Grade: "B", CX: 3.0, Min: 61, Max: 67.99},
					{Grade: "C+", CX: 2.5, Min: 54, Max: 60.99},
					{Grade: "C", CX: 2.0, Min: 47, Max: 53.99},
					{Grade: "D+", CX: 1.5, Min: 40, Max: 46.99},
					{Grade: "D", CX: 1.0, Min: 34, Max: 39.99},
					{Grade: "F", CX: 0.0, Min: 0, Max: 33.99},
				},
			},
			{
				ID:          "scale-phy1-80",
				UserID:      adminUser.ID,
				Name:        "Physics I (A ที่ 80)",
				Description: "เกณฑ์วิชา Physics I ตัด A ที่ 80 แต่ D เริ่มที่ 34",
				IsDefault:   false,
				Ranges: []models.GradeRange{
					{Grade: "A", CX: 4.0, Min: 80, Max: 100},
					{Grade: "B+", CX: 3.5, Min: 73, Max: 79.99},
					{Grade: "B", CX: 3.0, Min: 65, Max: 72.99},
					{Grade: "C+", CX: 2.5, Min: 56, Max: 64.99},
					{Grade: "C", CX: 2.0, Min: 47, Max: 55.99},
					{Grade: "D+", CX: 1.5, Min: 40, Max: 46.99},
					{Grade: "D", CX: 1.0, Min: 34, Max: 39.99},
					{Grade: "F", CX: 0.0, Min: 0, Max: 33.99},
				},
			},
			{
				ID:          "scale-chem-70",
				UserID:      adminUser.ID,
				Name:        "Chemistry / A ที่ 70",
				Description: "เกณฑ์วิชาที่ตัด A ที่ 70 คะแนน",
				IsDefault:   false,
				Ranges: []models.GradeRange{
					{Grade: "A", CX: 4.0, Min: 70, Max: 100},
					{Grade: "B+", CX: 3.5, Min: 65, Max: 69.99},
					{Grade: "B", CX: 3.0, Min: 60, Max: 64.99},
					{Grade: "C+", CX: 2.5, Min: 55, Max: 59.99},
					{Grade: "C", CX: 2.0, Min: 50, Max: 54.99},
					{Grade: "D+", CX: 1.5, Min: 45, Max: 49.99},
					{Grade: "D", CX: 1.0, Min: 40, Max: 44.99},
					{Grade: "F", CX: 0.0, Min: 0, Max: 39.99},
				},
			},
		}

		for _, s := range scales {
			if err := db.Create(&s).Error; err != nil {
				log.Printf("seed: error creating scale %s: %v", s.ID, err)
			}
		}
		log.Println("seed: seeded default grade scales")
	}

	// 3. Seed Default Templates if none exist
	var tplCount int64
	db.Model(&models.ScoreTemplate{}).Count(&tplCount)
	if tplCount == 0 {
		tpls := []models.ScoreTemplate{
			{
				ID:     "tpl-chem-lab",
				UserID: adminUser.ID,
				Name:   "FUND CHEM I LAB (ควิซ, เช็คชื่อ, มิดเทอม, ไฟนอล)",
				Columns: []models.ScoreColumn{
					{ID: "col-c1", Name: "ควิซกลางภาค", MaxScore: 10, Order: 0},
					{ID: "col-c2", Name: "ควิซปลายภาค", MaxScore: 10, Order: 1},
					{ID: "col-c3", Name: "เช็คชื่อ & ปฏิบัติการ", MaxScore: 20, Order: 2},
					{ID: "col-c4", Name: "สอบกลางภาค", MaxScore: 30, Order: 3},
					{ID: "col-c5", Name: "สอบปลายภาค", MaxScore: 30, Order: 4},
				},
			},
			{
				ID:     "tpl-standard",
				UserID: adminUser.ID,
				Name:   "มาตรฐาน (ควิซ, การบ้าน, สอบ)",
				Columns: []models.ScoreColumn{
					{ID: "col-s1", Name: "ควิซ / การบ้าน", MaxScore: 20, Order: 0},
					{ID: "col-s2", Name: "สอบกลางภาค", MaxScore: 40, Order: 1},
					{ID: "col-s3", Name: "สอบปลายภาค", MaxScore: 40, Order: 2},
				},
			},
		}

		for _, t := range tpls {
			if err := db.Create(&t).Error; err != nil {
				log.Printf("seed: error creating template %s: %v", t.ID, err)
			}
		}
		log.Println("seed: seeded default score templates")
	}
}
