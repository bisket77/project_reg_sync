package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port, DBHost, DBPort, DBUser, DBPassword, DBName string
	AllowedOrigin, AdminToken                        string
	ScrapeURL, ScrapeCookie                          string
	ScrapePostURL                                    string
	CoursePrefixes                                   []string
	Years, Semesters                                 []string
	Interval                                         time.Duration
	ColCode, ColName, ColCredits, ColSection         []string
}

func get(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func list(k, d string) []string {
	var out []string
	for _, s := range strings.Split(get(k, d), ",") {
		if s = strings.TrimSpace(s); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func Load() *Config {
	min, _ := strconv.Atoi(get("SCRAPE_INTERVAL_MIN", "30"))
	if min < 5 {
		min = 5 // กันยิงถี่เกินไป
	}
	return &Config{
		Port: get("PORT", "8080"), DBHost: get("DB_HOST", "localhost"), DBPort: get("DB_PORT", "5432"),
		DBUser: get("DB_USER", "postgres"), DBPassword: get("DB_PASSWORD", "postgres"), DBName: get("DB_NAME", "subjects"),
		AllowedOrigin: get("ALLOWED_ORIGIN", "*"), AdminToken: get("ADMIN_TOKEN", ""),
		ScrapeURL:      get("SCRAPE_URL_TEMPLATE", ""),
		ScrapePostURL:  get("SCRAPE_POST_URL", "https://reg2.sut.ac.th/registrar/class_info_1.asp?avs710615754=2&backto=home"),
		CoursePrefixes: list("SCRAPE_COURSE_PREFIXES", "ENG23*,ENG20*"),
		ScrapeCookie:   get("SCRAPE_COOKIE", ""),
		Years:          list("SCRAPE_YEARS", "2567,2568"),
		Semesters:      list("SCRAPE_SEMESTERS", "1,2,3"),
		Interval:       time.Duration(min) * time.Minute,
		ColCode:        list("COL_CODE", "รหัสวิชา"),
		ColName:        list("COL_NAME", "ชื่อวิชา"),
		ColCredits:     list("COL_CREDITS", "หน่วยกิต"),
		ColSection:     list("COL_SECTION", "กลุ่ม,ตอน"),
	}
}
