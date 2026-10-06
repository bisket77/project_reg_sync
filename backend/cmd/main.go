package main

import (
	"log"

	"github.com/joho/godotenv"

	"project_see_subject/internal/config"
	"project_see_subject/internal/models"
	"project_see_subject/internal/routes"
	"project_see_subject/internal/scraper"
)

func main() {
	_ = godotenv.Load() // ใช้ตอนรันนอก docker
	cfg := config.Load()
	db, err := config.ConnectDB(cfg)
	if err != nil {
		log.Fatal("db: ", err)
	}
	if err := db.AutoMigrate(&models.Course{}); err != nil {
		log.Fatal("migrate: ", err)
	}
	if (cfg.ScrapePostURL != "" || cfg.ScrapeURL != "") && len(cfg.Years) > 0 {
		scraper.Start(cfg, db)
	} else {
		log.Println("SCRAPE_POST_URL หรือ SCRAPE_YEARS ยังไม่ตั้งค่า → ไม่เริ่ม scraper")
	}
	log.Fatal(routes.Setup(cfg, db).Run(":" + cfg.Port))
}
