package scheduler

import (
	"encoding/json"
	"log"

	"github.com/XIU2/CloudflareSpeedTest/web/models"
	"github.com/XIU2/CloudflareSpeedTest/web/service"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

var (
	c  *cron.Cron
	db *gorm.DB
)

func Init(database *gorm.DB) {
	db = database
	c = cron.New()
	c.Start()
	ReloadTasks()

	// Add default monitor task: every 5 minutes
	c.AddFunc("*/5 * * * *", func() {
		log.Println("Running premium IP monitor task...")
		service.MonitorPremiumIPs()
	})
}

func ReloadTasks() {
	// Stop existing tasks
	for _, entry := range c.Entries() {
		c.Remove(entry.ID)
	}

	var configs []models.Config
	db.Where("key LIKE ?", "cron_%").Find(&configs)

	for _, cfg := range configs {
		var params service.TestParams
		if err := json.Unmarshal([]byte(cfg.Value), &params); err != nil {
			log.Printf("Failed to unmarshal cron task %s: %v", cfg.Key, err)
			continue
		}

		// Key format: cron_CRONEXPR
		cronExpr := cfg.Key[5:]
		_, err := c.AddFunc(cronExpr, func() {
			log.Printf("Running scheduled task: %s", cronExpr)
			service.RunSpeedTest(params)
		})
		if err != nil {
			log.Printf("Failed to add cron task %s: %v", cronExpr, err)
		}
	}
}

func AddTask(expr string, params service.TestParams) error {
	val, _ := json.Marshal(params)
	err := db.Save(&models.Config{
		Key:   "cron_" + expr,
		Value: string(val),
	}).Error
	if err == nil {
		ReloadTasks()
	}
	return err
}

func DeleteTask(expr string) error {
	err := db.Where("key = ?", "cron_"+expr).Delete(&models.Config{}).Error
	if err == nil {
		ReloadTasks()
	}
	return err
}

func GetTasks() (map[string]service.TestParams, error) {
	var configs []models.Config
	db.Where("key LIKE ?", "cron_%").Find(&configs)
	
	tasks := make(map[string]service.TestParams)
	for _, cfg := range configs {
		var params service.TestParams
		json.Unmarshal([]byte(cfg.Value), &params)
		tasks[cfg.Key[5:]] = params
	}
	return tasks, nil
}
