package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"project_see_subject/internal/config"
	"project_see_subject/internal/models"
	"project_see_subject/internal/scraper"
)

type CourseController struct {
	DB  *gorm.DB
	Cfg *config.Config
}

// GET /api/courses?year=&semester=&q=&page=&limit=
func (h *CourseController) List(c *gin.Context) {
	q := h.DB.Model(&models.Course{})
	if v := c.Query("year"); v != "" {
		q = q.Where("year = ?", v)
	}
	if v := c.Query("semester"); v != "" {
		q = q.Where("semester = ?", v)
	}
	if v := c.Query("q"); v != "" {
		like := "%" + v + "%"
		q = q.Where("code ILIKE ? OR name ILIKE ?", like, like)
	}
	var total int64
	q.Count(&total)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 1000 {
		limit = 200
	}
	var items []models.Course
	q.Order("code, section").Offset((page - 1) * limit).Limit(limit).Find(&items)
	c.JSON(200, gin.H{"total": total, "page": page, "items": items})
}

// GET /api/terms → ปี/เทอมที่มีข้อมูล
func (h *CourseController) Terms(c *gin.Context) {
	var rows []struct {
		Year     string `json:"year"`
		Semester string `json:"semester"`
	}
	h.DB.Model(&models.Course{}).Select("DISTINCT year, semester").Order("year DESC, semester DESC").Scan(&rows)
	c.JSON(200, rows)
}

// GET /api/status
func (h *CourseController) Status(c *gin.Context) { c.JSON(200, scraper.GetStatus()) }

// POST /api/scrape (ต้องส่ง header X-Admin-Token) สั่งดึงทันที
func (h *CourseController) Scrape(c *gin.Context) {
	if h.Cfg.AdminToken == "" || c.GetHeader("X-Admin-Token") != h.Cfg.AdminToken {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	go scraper.Run(h.Cfg, h.DB)
	c.JSON(202, gin.H{"message": "started"})
}
