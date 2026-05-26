package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

func (s *Server) handleGetStreams(c *gin.Context) {
	streams, err := s.srs.GetStreams()
	if err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "获取推流列表失败: " + err.Error(),
			Data:    []StreamInfo{},
		})
		return
	}

	for i := range streams {
		streams[i].IsRecording = s.ffmpeg.IsRecording(streams[i].Name)
		if start := s.ffmpeg.GetRecordingStartTime(streams[i].Name); start != "" {
			streams[i].RecordingSince = start
		}
	}

	if streams == nil {
		streams = []StreamInfo{}
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    streams,
	})
}

func (s *Server) handleGetStream(c *gin.Context) {
	name := c.Param("name")

	streams, err := s.srs.GetStreams()
	if err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "获取推流信息失败: " + err.Error(),
		})
		return
	}

	for _, stream := range streams {
		if stream.Name == name {
			stream.IsRecording = s.ffmpeg.IsRecording(stream.Name)
			if start := s.ffmpeg.GetRecordingStartTime(stream.Name); start != "" {
				stream.RecordingSince = start
			}
			c.JSON(http.StatusOK, APIResponse{
				Success: true,
				Data:    stream,
			})
			return
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: false,
		Message: fmt.Sprintf("推流未找到: %s", name),
	})
}

func (s *Server) handleStartRecord(c *gin.Context) {
	name := c.Param("name")

	if err := s.ffmpeg.StartRecording(name); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "开始录制失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "开始录制: " + name,
	})
}

func (s *Server) handleStopRecord(c *gin.Context) {
	name := c.Param("name")

	if err := s.ffmpeg.StopRecording(name); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "停止录制失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "停止录制: " + name,
	})
}

func (s *Server) handleGetRelay(c *gin.Context) {
	relay := s.ffmpeg.GetRelay()
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    relay,
	})
}

type RelayRequest struct {
	StreamName string `json:"stream_name" binding:"required"`
	TargetURL  string `json:"target_url" binding:"required"`
}

func (s *Server) handleStartRelay(c *gin.Context) {
	var req RelayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "参数错误: " + err.Error(),
		})
		return
	}

	if err := s.ffmpeg.StartRelay(req.StreamName, req.TargetURL); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "启动转推失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已切换转推至: " + req.StreamName,
	})
}

func (s *Server) handleStopRelay(c *gin.Context) {
	if err := s.ffmpeg.StopRelay(); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "停止转推失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已停止转推",
	})
}

func (s *Server) handleGetRecordings(c *gin.Context) {
	recordings, err := s.ffmpeg.ListRecordings()
	if err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "获取录制列表失败: " + err.Error(),
			Data:    []RecordingInfo{},
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    recordings,
	})
}

func (s *Server) handleGetRecordingFile(c *gin.Context) {
	filePath := c.Param("filepath")
	fullPath := filepath.Join(s.ffmpeg.recordingsDir, filePath)

	c.FileAttachment(fullPath, filepath.Base(fullPath))
}

func (s *Server) handleDeleteRecording(c *gin.Context) {
	filePath := c.Param("filepath")
	fullPath := filepath.Join(s.ffmpeg.recordingsDir, filePath)

	if err := os.Remove(fullPath); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "删除失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已删除",
	})
}

type RenameRequest struct {
	NewName string `json:"new_name" binding:"required"`
}

func (s *Server) handleRenameRecording(c *gin.Context) {
	filePath := c.Param("filepath")
	var req RenameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "参数错误: " + err.Error(),
		})
		return
	}

	oldPath := filepath.Join(s.ffmpeg.recordingsDir, filePath)
	dir := filepath.Dir(oldPath)
	newPath := filepath.Join(dir, req.NewName)

	if err := os.Rename(oldPath, newPath); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "重命名失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已重命名",
	})
}

func (s *Server) handleProbeStream(c *gin.Context) {
	name := c.Param("name")
	codec, err := s.srs.GetStreamCodec(name)
	if err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "探测编码失败: " + err.Error(),
		})
		return
	}

	needTranscode := codec == "H265" || codec == "hevc" || codec == "HEVC"

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"video_codec":    codec,
			"need_transcode": needTranscode,
		},
	})
}

func (s *Server) handleHookPublish(c *gin.Context) {
	var hook HookRequest
	if err := c.ShouldBindJSON(&hook); err != nil {
		c.JSON(200, gin.H{"code": -1, "message": "invalid hook"})
		return
	}
	c.JSON(200, gin.H{"code": 0})
}

func (s *Server) handleHookUnpublish(c *gin.Context) {
	var hook HookRequest
	if err := c.ShouldBindJSON(&hook); err != nil {
		c.JSON(200, gin.H{"code": -1, "message": "invalid hook"})
		return
	}

	s.ffmpeg.StopRecording(hook.Stream)

	c.JSON(200, gin.H{"code": 0})
}

func (s *Server) handleGetOutput(c *gin.Context) {
	output := s.ffmpeg.GetOutput()
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    output,
	})
}

type OutputRequest struct {
	StreamName string `json:"stream_name" binding:"required"`
}

func (s *Server) handleSetOutput(c *gin.Context) {
	var req OutputRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "参数错误: " + err.Error(),
		})
		return
	}

	if err := s.ffmpeg.StartOutput(req.StreamName); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "设置输出流失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已切换输出源至: " + req.StreamName,
		Data:    s.ffmpeg.GetOutput(),
	})
}

func (s *Server) handleStopOutput(c *gin.Context) {
	if err := s.ffmpeg.StopOutput(); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "停止输出流失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已停止输出流",
		Data:    s.ffmpeg.GetOutput(),
	})
}

func (s *Server) handleStartPreview(c *gin.Context) {
	name := c.Param("name")

	previewName, err := s.ffmpeg.StartPreview(name)
	if err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "启动预览转码失败: " + err.Error(),
		})
		return
	}

	flvURL := fmt.Sprintf("%s/%s.flv", runtimeSettings.GetPublicFLVURL(), previewName)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"preview_name": previewName,
			"flv_url":      flvURL,
		},
	})
}

func (s *Server) handleStopPreview(c *gin.Context) {
	name := c.Param("name")

	if err := s.ffmpeg.StopPreview(name); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "停止预览转码失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "已停止预览转码",
	})
}

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

type SettingsResponse struct {
	PublicFLVURL string   `json:"public_flv_url"`
	PublicRTMP   string   `json:"public_rtmp"`
	RelayPresets []string `json:"relay_presets"`
}

func (s *Server) handleGetSettings(c *gin.Context) {
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: SettingsResponse{
			PublicFLVURL: runtimeSettings.GetPublicFLVURL(),
			PublicRTMP:   runtimeSettings.GetPublicRTMP(),
			RelayPresets: runtimeSettings.GetRelayPresets(),
		},
	})
}

type UpdateSettingsRequest struct {
	PublicFLVURL string   `json:"public_flv_url"`
	PublicRTMP   string   `json:"public_rtmp"`
	RelayPresets []string `json:"relay_presets"`
}

func (s *Server) handleUpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, APIResponse{
			Success: false,
			Message: "参数错误: " + err.Error(),
		})
		return
	}

	runtimeSettings.Update(req.PublicFLVURL, req.PublicRTMP, req.RelayPresets)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: "设置已更新",
		Data: SettingsResponse{
			PublicFLVURL: runtimeSettings.GetPublicFLVURL(),
			PublicRTMP:   runtimeSettings.GetPublicRTMP(),
			RelayPresets: runtimeSettings.GetRelayPresets(),
		},
	})
}
