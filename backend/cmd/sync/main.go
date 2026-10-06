package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"project_see_subject/internal/config"
	"project_see_subject/internal/models"
	"project_see_subject/internal/scraper"
)

type SyncOutput struct {
	UpdatedAt     string          `json:"updated_at"`
	UpdatedAtThai string          `json:"updated_at_thai"`
	TotalScraped  int             `json:"total_scraped"`
	Years         []string        `json:"years"`
	Items         []models.Course `json:"items"`
}

func main() {
	cfg := config.Load()
	log.Println("Starting SUT REG sync to courses.json...")
	log.Printf("Years: %v | Semesters: %v | Prefixes: %v\n", cfg.Years, cfg.Semesters, cfg.CoursePrefixes)

	var allCourses []models.Course
	seen := map[string]bool{}

	prefixes := cfg.CoursePrefixes
	if len(prefixes) == 0 {
		prefixes = []string{"ENG23*", "ENG20*"}
	}

	for _, y := range cfg.Years {
		for _, s := range cfg.Semesters {
			for _, prefix := range prefixes {
				courses, err := scraper.ScrapeSutPost(cfg, y, s, prefix)
				if err != nil {
					log.Printf("Error %s/%s (%s): %v\n", y, s, prefix, err)
					continue
				}
				for _, c := range courses {
					key := fmt.Sprintf("%s|%s|%s|%s", c.Year, c.Semester, c.Code, c.Section)
					if !seen[key] {
						seen[key] = true
						allCourses = append(allCourses, c)
					}
				}
				log.Printf("Scraped %s/%s (%s): %d courses\n", y, s, prefix, len(courses))
				time.Sleep(500 * time.Millisecond)
			}
		}
	}

	loc, _ := time.LoadLocation("Asia/Bangkok")
	now := time.Now().In(loc)
	thaiYear := now.Year() + 543
	thaiTimeStr := fmt.Sprintf("%d %s %d %02d:%02d น.",
		now.Day(),
		getThaiMonth(int(now.Month())),
		thaiYear,
		now.Hour(),
		now.Minute(),
	)

	out := SyncOutput{
		UpdatedAt:     now.Format(time.RFC3339),
		UpdatedAtThai: thaiTimeStr,
		TotalScraped:  len(allCourses),
		Years:         cfg.Years,
		Items:         allCourses,
	}

	jsonBytes, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		log.Fatalf("JSON marshal failed: %v", err)
	}

	// Output paths
	destPaths := []string{
		filepath.Join("..", "frontend", "public", "courses.json"),
		filepath.Join("frontend", "public", "courses.json"),
		filepath.Join(".", "courses.json"),
	}

	written := false
	for _, p := range destPaths {
		dir := filepath.Dir(p)
		if err := os.MkdirAll(dir, 0755); err == nil {
			if err := os.WriteFile(p, jsonBytes, 0644); err == nil {
				log.Printf("Saved: %s (%d records)\n", p, len(allCourses))
				written = true
			}
		}
	}

	if !written {
		log.Println("Warning: could not write to default destination paths, wrote to current directory")
		_ = os.WriteFile("courses.json", jsonBytes, 0644)
	}

	log.Printf("Sync completed successfully: %d records saved\n", len(allCourses))
}

func getThaiMonth(m int) string {
	months := []string{
		"", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
		"ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
	}
	if m >= 1 && m <= 12 {
		return months[m]
	}
	return ""
}
