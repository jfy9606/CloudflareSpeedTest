package router

import (
	"net/http"
	"strconv"

	"github.com/XIU2/CloudflareSpeedTest/web/scheduler"
	"github.com/XIU2/CloudflareSpeedTest/web/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.Default()

	// CORS
	r.Use(cors.Default())

	api := r.Group("/api")
	{
		api.POST("/test", handleRunTest)
		api.GET("/history", handleGetHistory)
		api.GET("/tasks", handleGetTasks)
		api.POST("/tasks", handleAddTask)
		api.DELETE("/tasks", handleDeleteTask)
		api.GET("/premium", handleGetPremium)
		api.GET("/premium/logs", handleGetPremiumLogs)
	}

	// Serve frontend
	r.StaticFS("/ui", http.Dir("./frontend/dist"))
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/ui")
	})

	return r
}

func handleRunTest(c *gin.Context) {
	var params service.TestParams
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	records, err := service.RunSpeedTest(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

func handleGetHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)
	records, err := service.GetHistory(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

func handleGetTasks(c *gin.Context) {
	tasks, err := scheduler.GetTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func handleAddTask(c *gin.Context) {
	var input struct {
		Cron   string             `json:"cron"`
		Params service.TestParams `json:"params"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := scheduler.AddTask(input.Cron, input.Params); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func handleDeleteTask(c *gin.Context) {
	cronExpr := c.Query("cron")
	if cronExpr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cron query param required"})
		return
	}

	if err := scheduler.DeleteTask(cronExpr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func handleGetPremium(c *gin.Context) {
	ips, err := service.GetPremiumIPs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ips)
}

func handleGetPremiumLogs(c *gin.Context) {
	ip := c.Query("ip")
	if ip == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ip query param required"})
		return
	}
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)
	logs, err := service.GetMonitorLogs(ip, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}
