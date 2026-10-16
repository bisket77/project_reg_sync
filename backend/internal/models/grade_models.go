package models

import (
	"time"
)

// User represents an authenticated account
type User struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Username     string    `gorm:"size:64;uniqueIndex;not null" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Name         string    `gorm:"size:128" json:"name"`
	Role         string    `gorm:"size:32;default:'user'" json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// GradeScale represents a grading policy (e.g. Standard A=80, LN/CN A=75)
type GradeScale struct {
	ID          string       `gorm:"primaryKey;size:64" json:"id"`
	UserID      uint         `gorm:"index" json:"user_id"`
	Name        string       `gorm:"size:128;not null" json:"name"`
	Description string       `gorm:"size:255" json:"description"`
	IsDefault   bool         `gorm:"default:false" json:"is_default"`
	Ranges      []GradeRange `gorm:"foreignKey:GradeScaleID;constraint:OnDelete:CASCADE" json:"ranges"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// GradeRange defines an individual cut-off within a scale
type GradeRange struct {
	ID           uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	GradeScaleID string  `gorm:"size:64;index;not null" json:"scale_id"`
	Grade        string  `gorm:"size:8;not null" json:"grade"`
	CX           float64 `gorm:"type:decimal(4,2);not null" json:"cx"`
	Min          float64 `gorm:"type:decimal(6,2);not null" json:"min"`
	Max          float64 `gorm:"type:decimal(6,2);not null" json:"max"`
}

// UserCourse represents an enrolled course for a specific trimester
type UserCourse struct {
	ID           string    `gorm:"primaryKey;size:64" json:"id"`
	UserID       uint      `gorm:"index;not null" json:"user_id"`
	Year         int       `gorm:"not null" json:"year"`
	Trimester    int       `gorm:"not null" json:"trimester"`
	Code         string    `gorm:"size:32;not null" json:"code"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Credits      float64   `gorm:"type:decimal(4,2);not null" json:"credits"`
	GradeScaleID string    `gorm:"size:64" json:"scale_id"`
	TemplateID   string    `gorm:"size:64" json:"template_id"`
	HopeGrade    string    `gorm:"size:8" json:"hope_grade"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ScoreTemplate represents a score breakdown scheme (e.g. standard quizzes/midterm/final)
type ScoreTemplate struct {
	ID        string        `gorm:"primaryKey;size:64" json:"id"`
	UserID    uint          `gorm:"index" json:"user_id"`
	Name      string        `gorm:"size:128;not null" json:"name"`
	Columns   []ScoreColumn `gorm:"foreignKey:TemplateID;constraint:OnDelete:CASCADE" json:"columns"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

// ScoreColumn represents a score item column (Quiz, Homework, Midterm, etc.)
type ScoreColumn struct {
	ID         string  `gorm:"primaryKey;size:64" json:"id"`
	TemplateID string  `gorm:"size:64;index" json:"template_id"`
	CourseID   string  `gorm:"size:64;index" json:"course_id"`
	Name       string  `gorm:"size:128;not null" json:"name"`
	MaxScore   float64 `gorm:"type:decimal(6,2);default:100" json:"max_score"`
	Order      int     `gorm:"default:0" json:"order"`
}

// CourseScoreRecord stores a specific score entered for a course column
type CourseScoreRecord struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	CourseID  string    `gorm:"size:64;index;not null" json:"course_id"`
	ColumnID  string    `gorm:"size:64;index;not null" json:"column_id"`
	Score     float64   `gorm:"type:decimal(6,2)" json:"score"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserGradeState stores the complete synchronized state for a user's grade calculator
type UserGradeState struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	DataJSON  string    `gorm:"type:text;not null" json:"data_json"`
	UpdatedAt time.Time `json:"updated_at"`
}

