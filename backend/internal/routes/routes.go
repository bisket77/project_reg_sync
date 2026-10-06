package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"project_see_subject/internal/config"
	"project_see_subject/internal/controllers"
	"project_see_subject/internal/middleware"
)

func Setup(cfg *config.Config, db *gorm.DB) *gin.Engine {
	r := gin.Default()
	r.Use(middleware.CORS(cfg.AllowedOrigin))
	h := &controllers.CourseController{DB: db, Cfg: cfg}
	api := r.Group("/api")
	{
		api.GET("/courses", h.List)
		api.GET("/terms", h.Terms)
		api.GET("/status", h.Status)
		api.POST("/scrape", h.Scrape)
	}
	return r
}
