package scraper

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"golang.org/x/net/html/charset"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"project_see_subject/internal/config"
	"project_see_subject/internal/models"
)

type Status struct {
	LastRun   time.Time `json:"last_run"`
	LastError string    `json:"last_error"`
	LastCount int       `json:"last_count"`
	Running   bool      `json:"running"`
}

var (
	mu     sync.Mutex
	status Status
	client = &http.Client{Timeout: 45 * time.Second}
)

func GetStatus() Status {
	mu.Lock()
	defer mu.Unlock()
	return status
}

// ScrapeSutPost ดึงข้อมูลจากฟอร์ม class_info_1.asp ของ REG มทส. (HTTP POST)
func ScrapeSutPost(cfg *config.Config, year, semester, prefix string) ([]models.Course, error) {
	postURL := cfg.ScrapePostURL
	if postURL == "" {
		postURL = "https://reg2.sut.ac.th/registrar/class_info_1.asp?avs710615754=2&backto=home"
	}

	data := url.Values{}
	data.Set("coursestatus", "O00")
	data.Set("facultyid", "all")
	data.Set("maxrow", "250")
	data.Set("acadyear", year)
	data.Set("semester", semester)
	data.Set("CAMPUSID", "")
	data.Set("LEVELID", "")
	data.Set("coursecode", prefix)
	data.Set("coursename", "")
	data.Set("cmd", "2")

	req, err := http.NewRequest("POST", postURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	if cfg.ScrapeCookie != "" {
		req.Header.Set("Cookie", cfg.ScrapeCookie)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "text/html; charset=windows-874"
	}
	r, err := charset.NewReader(resp.Body, contentType)
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return nil, err
	}

	seen := map[string]bool{}
	var list []models.Course

	doc.Find("tr").Each(func(_ int, tr *goquery.Selection) {
		link := tr.Find("a[href*='class_info_2.asp']")
		if link.Length() == 0 {
			return
		}

		rawText := strings.TrimSpace(link.Text())
		parts := strings.Split(rawText, "-")
		code := strings.TrimSpace(parts[0])
		sec := ""
		if len(parts) > 1 {
			sec = strings.TrimSpace(parts[1])
		}

		key := fmt.Sprintf("%s|%s", code, sec)
		if seen[key] {
			return
		}
		seen[key] = true

		tds := tr.Find("td")
		linkTdIdx := -1
		tds.Each(func(i int, td *goquery.Selection) {
			if td.Find("a[href*='class_info_2.asp']").Length() > 0 {
				linkTdIdx = i
			}
		})

		if linkTdIdx < 0 {
			return
		}

		// Course name (td ถัดไป)
		nameTd := tds.Eq(linkTdIdx + 1)
		nameHtml, _ := nameTd.Html()
		nameParts := strings.Split(nameHtml, "<br")
		nameDoc, _ := goquery.NewDocumentFromReader(strings.NewReader(nameParts[0]))
		cleanName := strings.TrimSpace(nameDoc.Text())

		// Credits
		credTd := tds.Eq(linkTdIdx + 2)
		credits := strings.TrimSpace(credTd.Text())

		// Exam schedules: Midterm (idx+3) & Final (idx+4)
		midtermText := strings.TrimSpace(tds.Eq(linkTdIdx + 3).Text())
		finalText := strings.TrimSpace(tds.Eq(linkTdIdx + 4).Text())

		// Times / Schedule
		timeTd := tds.Eq(linkTdIdx + 5)
		times := strings.Join(strings.Fields(timeTd.Text()), " ")

		// Section / Max / Enrolled / Remaining / Status
		sectionText := strings.TrimSpace(tds.Eq(linkTdIdx + 6).Text())
		if sec == "" && sectionText != "" {
			sec = sectionText
		}
		capText := strings.TrimSpace(tds.Eq(linkTdIdx + 7).Text())
		enrolledText := strings.TrimSpace(tds.Eq(linkTdIdx + 8).Text())
		remainText := strings.TrimSpace(tds.Eq(linkTdIdx + 9).Text())
		statusText := strings.TrimSpace(tds.Eq(linkTdIdx + 10).Text())

		rawMap := map[string]string{
			"รหัสวิชา":       code,
			"กลุ่ม":         sec,
			"ชื่อวิชา":       cleanName,
			"หน่วยกิต":      credits,
			"สอบกลางภาค":     strings.Join(strings.Fields(midtermText), " "),
			"สอบปลายภาค":     strings.Join(strings.Fields(finalText), " "),
			"เวลาเรียน":      times,
			"จำนวนรับ":      capText,
			"ลงทะเบียน":     enrolledText,
			"ที่นั่งเหลือ":    remainText,
			"สถานะ":        statusText,
			"อาจารย์_หมายเหตุ": strings.Join(strings.Fields(nameTd.Text()), " "),
		}
		rawBytes, _ := json.Marshal(rawMap)

		list = append(list, models.Course{
			Year:      year,
			Semester:  semester,
			Code:      code,
			Section:   sec,
			Name:      cleanName,
			Credits:   credits,
			Raw:       rawBytes,
			UpdatedAt: time.Now(),
		})
	})

	return list, nil
}

// Run ทำการดึงข้อมูลตามปี/เทอม/รหัสวิชาที่กำหนด แล้ว upsert ลง DB
func Run(cfg *config.Config, db *gorm.DB) {
	mu.Lock()
	if status.Running {
		mu.Unlock()
		return
	}
	status.Running = true
	mu.Unlock()

	total := 0
	var errs []string

	prefixes := cfg.CoursePrefixes
	if len(prefixes) == 0 {
		prefixes = []string{"ENG23*", "ENG20*"}
	}

	for _, y := range cfg.Years {
		for _, s := range cfg.Semesters {
			for _, prefix := range prefixes {
				courses, err := ScrapeSutPost(cfg, y, s, prefix)
				if err != nil {
					e := fmt.Sprintf("%s/%s (%s): %v", y, s, prefix, err)
					log.Println("scrape error:", e)
					errs = append(errs, e)
				} else if len(courses) > 0 {
					err = db.Clauses(clause.OnConflict{
						Columns: []clause.Column{
							{Name: "year"},
							{Name: "semester"},
							{Name: "code"},
							{Name: "section"},
						},
						DoUpdates: clause.AssignmentColumns([]string{"name", "credits", "raw", "updated_at"}),
					}).CreateInBatches(courses, 100).Error

					if err != nil {
						e := fmt.Sprintf("db save %s/%s (%s): %v", y, s, prefix, err)
						log.Println("db save error:", e)
						errs = append(errs, e)
					} else {
						total += len(courses)
						log.Printf("scraped %s/%s (%s): %d courses saved", y, s, prefix, len(courses))
					}
				}
				time.Sleep(1 * time.Second) // เว้นระยะเบาๆ ให้เซิร์ฟเวอร์
			}
		}
	}

	mu.Lock()
	status = Status{
		LastRun:   time.Now(),
		LastCount: total,
		LastError: strings.Join(errs, " | "),
		Running:   false,
	}
	mu.Unlock()

	log.Printf("scrape completed: total %d records, %d errors", total, len(errs))
}

// Start รันทันทีหนึ่งครั้ง แล้วรันซ้ำตามช่วงเวลา
func Start(cfg *config.Config, db *gorm.DB) {
	go func() {
		Run(cfg, db)
		t := time.NewTicker(cfg.Interval)
		for range t.C {
			Run(cfg, db)
		}
	}()
}
