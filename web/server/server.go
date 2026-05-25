package server

import (
	"log"

	"github.com/XIU2/CloudflareSpeedTest/web/models"
	"github.com/XIU2/CloudflareSpeedTest/web/router"
	"github.com/XIU2/CloudflareSpeedTest/web/scheduler"
	"github.com/XIU2/CloudflareSpeedTest/web/service"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func StartServer(addr string) {
	// Initialize DB
	db, err := gorm.Open(sqlite.Open("data.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}

	if err := models.InitDB(db); err != nil {
		log.Fatal("failed to migrate database")
	}

	// Initialize components
	service.SetDB(db)
	scheduler.Init(db)

	// Start router
	r := router.InitRouter()
	log.Printf("Starting web server on %s...", addr)
	r.Run(addr)
}
