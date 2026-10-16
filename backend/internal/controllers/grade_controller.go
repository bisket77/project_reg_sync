package controllers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"project_see_subject/internal/models"
)

type GradeController struct {
	DB *gorm.DB
}

func (g *GradeController) GetGradeData(c *gin.Context) {
	val, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
		return
	}
	userID := val.(uint)

	var state models.UserGradeState
	if err := g.DB.Where("user_id = ?", userID).First(&state).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// No custom state yet, return default scales and templates
			var scales []models.GradeScale
			g.DB.Preload("Ranges").Find(&scales)

			var templates []models.ScoreTemplate
			g.DB.Preload("Columns").Find(&templates)

			c.JSON(http.StatusOK, gin.H{
				"scales":    scales,
				"templates": templates,
				"courses":   []interface{}{},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "เกิดข้อผิดพลาดในการดึงข้อมูล"})
		return
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(state.DataJSON), &data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	c.JSON(http.StatusOK, data)
}

func (g *GradeController) SaveGradeData(c *gin.Context) {
	val, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
		return
	}
	userID := val.(uint)

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil || len(bodyBytes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลว่างเปล่า"})
		return
	}

	// Validate JSON
	var temp map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &temp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบ JSON ไม่ถูกต้อง"})
		return
	}

	var state models.UserGradeState
	result := g.DB.Where("user_id = ?", userID).First(&state)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			state = models.UserGradeState{
				UserID:    userID,
				DataJSON:  string(bodyBytes),
				UpdatedAt: time.Now(),
			}
			if err := g.DB.Create(&state).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลได้"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล"})
			return
		}
	} else {
		state.DataJSON = string(bodyBytes)
		state.UpdatedAt = time.Now()
		if err := g.DB.Save(&state).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตข้อมูลได้"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"updated_at": state.UpdatedAt,
	})
}

func (g *GradeController) ResetGradeData(c *gin.Context) {
	val, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
		return
	}
	userID := val.(uint)

	if err := g.DB.Where("user_id = ?", userID).Delete(&models.UserGradeState{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถรีเซ็ตข้อมูลได้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "รีเซ็ตข้อมูลเกรดเรียบร้อยแล้ว",
	})
}
