package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var cfg Config

type Server struct {
	srs    *SRSClient
	ffmpeg *FFmpegManager
}

func main() {
	cfg = LoadConfig()

	srsClient := NewSRSClient(cfg.SRSAPIURL)
	ffmpegManager := NewFFmpegManager(cfg.RecordingsDir, cfg.SRSStreamURL)

	server := &Server{
		srs:    srsClient,
		ffmpeg: ffmpegManager,
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	// Health
	r.GET("/api/health", server.handleHealth)

	// Stream management
	r.GET("/api/streams", server.handleGetStreams)
	r.GET("/api/streams/:name", server.handleGetStream)

	// Recording
	r.POST("/api/streams/:name/record", server.handleStartRecord)
	r.DELETE("/api/streams/:name/record", server.handleStopRecord)

	// Preview transcode (H.265 → H.264)
	r.POST("/api/streams/:name/preview", server.handleStartPreview)
	r.DELETE("/api/streams/:name/preview", server.handleStopPreview)

	// Stream codec probe
	r.GET("/api/streams/:name/probe", server.handleProbeStream)

	// Relay
	r.GET("/api/relay", server.handleGetRelay)
	r.POST("/api/relay", server.handleStartRelay)
	r.DELETE("/api/relay", server.handleStopRelay)

	// Output (fixed pull stream)
	r.GET("/api/output", server.handleGetOutput)
	r.POST("/api/output", server.handleSetOutput)
	r.DELETE("/api/output", server.handleStopOutput)

	// Recordings listing
	r.GET("/api/recordings", server.handleGetRecordings)
	r.GET("/api/recordings/download/*filepath", server.handleGetRecordingFile)
	r.DELETE("/api/recordings/*filepath", server.handleDeleteRecording)
	r.PUT("/api/recordings/*filepath", server.handleRenameRecording)

	// Settings
	r.GET("/api/settings", server.handleGetSettings)
	r.PUT("/api/settings", server.handleUpdateSettings)

	// SRS hooks
	r.POST("/api/hooks/on_publish", server.handleHookPublish)
	r.POST("/api/hooks/on_unpublish", server.handleHookUnpublish)

	r.Run(":" + cfg.ServerPort)
}
