package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Datum Datum
type Datum struct {
	Data     []byte `json:"data" binding:"required"`
	FileName string `json:"fileName" binding:"required"`
}

// Save Save
func (d *Datum) Save() error {
	targetPath := path.Join("tmp", d.FileName)
	dirName := path.Dir(targetPath)
	if err := os.MkdirAll(dirName, 0777); err != nil {
		return err
	}
	if err := ioutil.WriteFile(targetPath, d.Data, 0644); err != nil {
		return err
	}
	return nil
}

func main() {
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowMethods: []string{
			"POST",
			"GET",
			"OPTIONS",
			"PUT",
			"DELETE",
		},
		AllowHeaders: []string{
			"Access-Control-Allow-Headers",
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
		},
		AllowOrigins: []string{
			"*",
		},
		MaxAge: 24 * time.Hour,
	}))

	r.POST("/receive", func(c *gin.Context) {
		var datum Datum
		if err := c.BindJSON(&datum); err != nil {
			log.Println(err)
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
			return
		}

		if err := datum.Save(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"message": "ok",
		})
	})
	r.Run() // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}
