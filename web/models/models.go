package models

import (
	"time"

	"gorm.io/gorm"
)

type Config struct {
	gorm.Model
	Key   string `gorm:"uniqueIndex"`
	Value string
}

type SpeedTestRecord struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	IP            string    `json:"ip"`
	Delay         float64   `json:"delay"`
	LossRate      float32   `json:"loss_rate"`
	DownloadSpeed float64   `json:"download_speed"`
	Colo          string    `json:"colo"`
	SourceAddr    string    `json:"source_addr"`
}

type PremiumIP struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	IP            string    `gorm:"uniqueIndex" json:"ip"`
	AvgDelay      float64   `json:"avg_delay"`
	MaxDelay      float64   `json:"max_delay"`
	MinDelay      float64   `json:"min_delay"`
	LossRate      float32   `json:"loss_rate"`
	DownloadSpeed float64   `json:"download_speed"`
	Colo          string    `json:"colo"`
	SourceAddr    string    `json:"source_addr"`
	Status        string    `json:"status"` // "active", "removed"
}

type MonitorLog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	IP          string    `gorm:"index" json:"ip"`
	Delay       float64   `json:"delay"`
	LossRate    float32   `json:"loss_rate"`
	SourceAddr  string    `json:"source_addr"`
}

type TaskLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"` // "running", "completed", "failed"
	Message   string    `json:"message"`
}

func InitDB(db *gorm.DB) error {
	return db.AutoMigrate(&Config{}, &SpeedTestRecord{}, &TaskLog{}, &PremiumIP{}, &MonitorLog{})
}
