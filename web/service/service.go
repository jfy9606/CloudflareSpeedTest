package service

import (
	"log"
	"net"
	"sync"
	"time"

	"github.com/XIU2/CloudflareSpeedTest/task"
	"github.com/XIU2/CloudflareSpeedTest/utils"
	"github.com/XIU2/CloudflareSpeedTest/web/models"
	"gorm.io/gorm"
)

var (
	testLock sync.Mutex
	db       *gorm.DB
)

func SetDB(database *gorm.DB) {
	db = database
}

type TestParams struct {
	Routines    int     `json:"routines"`
	PingTimes   int     `json:"ping_times"`
	TestCount   int     `json:"test_count"`
	DownloadTime int     `json:"download_time"`
	TCPPort     int     `json:"tcp_port"`
	URL         string  `json:"url"`
	Httping     bool    `json:"httping"`
	MaxDelay    int     `json:"max_delay"`
	MinSpeed    float64 `json:"min_speed"`
	SourceAddr  string  `json:"source_addr"`
}

func RunSpeedTest(params TestParams) ([]models.SpeedTestRecord, error) {
	testLock.Lock()
	defer testLock.Unlock()

	// Update global settings in task package
	task.Routines = params.Routines
	task.PingTimes = params.PingTimes
	task.TestCount = params.TestCount
	task.TCPPort = params.TCPPort
	task.URL = params.URL
	task.Httping = params.Httping
	task.MinSpeed = params.MinSpeed
	task.SourceAddr = params.SourceAddr
	
	utils.InputMaxDelay = time.Duration(params.MaxDelay) * time.Millisecond
	task.Timeout = time.Duration(params.DownloadTime) * time.Second

	// Run test
	log.Println("Starting speed test...")
	pingData := task.NewPing().Run().FilterDelay().FilterLossRate()
	speedData := task.TestDownloadSpeed(pingData)

	records := make([]models.SpeedTestRecord, 0)
	for _, d := range speedData {
		record := models.SpeedTestRecord{
			IP:            d.IP.String(),
			Delay:         float64(d.Delay.Milliseconds()),
			LossRate:      d.LossRate,
			DownloadSpeed: d.DownloadSpeed / 1024 / 1024, // Convert to MB/s
			Colo:          d.Colo,
			SourceAddr:    params.SourceAddr,
		}
		records = append(records, record)
		
		// Save to DB
		if db != nil {
			db.Create(&record)
		}
	}

	// Update Premium IPs if db is available
	if db != nil {
		UpdatePremiumIPs(records)
	}

	return records, nil
}

func UpdatePremiumIPs(records []models.SpeedTestRecord) {
	for _, r := range records {
		// Criteria for Premium IP: No loss, Delay < 100ms, Speed > 5MB/s (customizable)
		if r.LossRate == 0 && r.Delay < 100 && r.DownloadSpeed > 5 {
			var p models.PremiumIP
			err := db.Where("ip = ?", r.IP).First(&p).Error
			if err != nil {
				// New premium IP
				db.Create(&models.PremiumIP{
					IP:            r.IP,
					AvgDelay:      r.Delay,
					MinDelay:      r.Delay,
					MaxDelay:      r.Delay,
					LossRate:      r.LossRate,
					DownloadSpeed: r.DownloadSpeed,
					Colo:          r.Colo,
					SourceAddr:    r.SourceAddr,
					Status:        "active",
				})
			} else {
				// Update existing
				p.AvgDelay = (p.AvgDelay + r.Delay) / 2
				if r.Delay < p.MinDelay {
					p.MinDelay = r.Delay
				}
				if r.Delay > p.MaxDelay {
					p.MaxDelay = r.Delay
				}
				p.LossRate = r.LossRate
				p.DownloadSpeed = r.DownloadSpeed
				p.Status = "active"
				db.Save(&p)
			}
		}
	}
}

func GetPremiumIPs() ([]models.PremiumIP, error) {
	var ips []models.PremiumIP
	err := db.Where("status = ?", "active").Find(&ips).Error
	return ips, err
}

func MonitorPremiumIPs() {
	ips, _ := GetPremiumIPs()
	for _, p := range ips {
		// Set task parameters for ping only
		task.TCPPort = 443
		task.PingTimes = 5
		task.SourceAddr = p.SourceAddr
		
		// Use tcping directly for monitoring
		ping := task.NewPing()
		recv, totalDelay, _ := ping.CheckConnection(getIPAddr(p.IP))
		
		lossRate := 1.0 - float32(recv)/float32(task.PingTimes)
		var avgDelay float64
		if recv > 0 {
			avgDelay = float64((totalDelay / time.Duration(recv)).Milliseconds())
		}

		// Log monitor result
		db.Create(&models.MonitorLog{
			IP:         p.IP,
			Delay:      avgDelay,
			LossRate:   lossRate,
			SourceAddr: p.SourceAddr,
		})

		// Maintenance strategy: Remove if loss > 20% or delay increased significantly
		if lossRate > 0.2 || (avgDelay > p.AvgDelay*2 && avgDelay > 150) {
			p.Status = "removed"
			db.Save(&p)
			log.Printf("Premium IP %s removed due to quality degradation (Delay: %.1f, Loss: %.1f)", p.IP, avgDelay, lossRate)
		} else {
			// Update stats
			p.AvgDelay = (p.AvgDelay*9 + avgDelay) / 10
			db.Save(&p)
		}
	}
}

func getIPAddr(ip string) *net.IPAddr {
	addr, _ := net.ResolveIPAddr("ip", ip)
	return addr
}

func GetMonitorLogs(ip string, limit int) ([]models.MonitorLog, error) {
	var logs []models.MonitorLog
	err := db.Where("ip = ?", ip).Order("created_at desc").Limit(limit).Find(&logs).Error
	return logs, err
}

func GetHistory(limit int) ([]models.SpeedTestRecord, error) {
	var records []models.SpeedTestRecord
	err := db.Order("created_at desc").Limit(limit).Find(&records).Error
	return records, err
}
