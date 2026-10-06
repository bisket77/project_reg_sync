package models

import (
	"encoding/json"
	"time"
)

type Course struct {
	ID        uint            `gorm:"primaryKey" json:"id"`
	Year      string          `gorm:"uniqueIndex:idx_course,priority:1" json:"year"`
	Semester  string          `gorm:"uniqueIndex:idx_course,priority:2" json:"semester"`
	Code      string          `gorm:"uniqueIndex:idx_course,priority:3" json:"code"`
	Section   string          `gorm:"uniqueIndex:idx_course,priority:4" json:"section"`
	Name      string          `json:"name"`
	Credits   string          `json:"credits"`
	Raw       json.RawMessage `gorm:"type:jsonb" json:"raw"` // ทุกคอลัมน์จากตารางต้นทาง
	UpdatedAt time.Time       `json:"updated_at"`
}
