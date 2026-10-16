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

	courseCtrl := &controllers.CourseController{DB: db, Cfg: cfg}
	authCtrl := &controllers.AuthController{DB: db, Secret: cfg.AdminToken}
	gradeCtrl := &controllers.GradeController{DB: db}

	api := r.Group("/api")
	{
		// Public Course viewer routes
		api.GET("/courses", courseCtrl.List)
		api.GET("/terms", courseCtrl.Terms)
		api.GET("/status", courseCtrl.Status)
		api.POST("/scrape", courseCtrl.Scrape)

		// Public Auth routes
		api.POST("/auth/login", authCtrl.Login)

		// Protected Auth routes
		authGroup := api.Group("/auth")
		authGroup.Use(controllers.AuthMiddleware(cfg.AdminToken))
		{
			authGroup.GET("/me", authCtrl.Me)
		}

		// Protected Grade Calculation routes
		gradeGroup := api.Group("/grade")
		gradeGroup.Use(controllers.AuthMiddleware(cfg.AdminToken))
		{
			gradeGroup.GET("/data", gradeCtrl.GetGradeData)
			gradeGroup.POST("/data", gradeCtrl.SaveGradeData)
			gradeGroup.POST("/reset", gradeCtrl.ResetGradeData)
		}
	}
	return r
}
