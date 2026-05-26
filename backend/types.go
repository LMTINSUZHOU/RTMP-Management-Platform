package main

import "time"

type StreamInfo struct {
	Name           string `json:"name"`
	App            string `json:"app"`
	URL            string `json:"url"`
	FlvURL         string `json:"flv_url"`
	ClientID       string `json:"client_id"`
	IsRecording    bool   `json:"is_recording"`
	RecordingSince string `json:"recording_since,omitempty"`
}

type RecordingInfo struct {
	FileName   string `json:"file_name"`
	FilePath   string `json:"file_path"`
	StreamName string `json:"stream_name"`
	SizeBytes  int64  `json:"size_bytes"`
	StartTime  string `json:"start_time"`
	Duration   string `json:"duration,omitempty"`
}

type RelayInfo struct {
	StreamName string `json:"stream_name"`
	TargetURL  string `json:"target_url"`
	IsActive   bool   `json:"is_active"`
	StartedAt  string `json:"started_at,omitempty"`
}

type HookRequest struct {
	Action   string `json:"action"`
	ClientID string `json:"client_id"`
	App      string `json:"app"`
	Stream   string `json:"stream"`
	Param    string `json:"param"`
}

// SRS API response - only declare fields we actually use.
// Go's json decoder silently ignores unknown JSON fields,
// so publish/video/audio/kbps etc. won't cause unmarshal errors.
type SRSStreamsResponse struct {
	Code    int         `json:"code"`
	Streams []SRSStream `json:"streams"`
}

type SRSStream struct {
	Stream   string `json:"name"`
	App      string `json:"app"`
	ClientID string `json:"client_id"`
}

// Wrapper for consistent API responses
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

type OutputInfo struct {
	IsActive   bool   `json:"is_active"`
	StreamName string `json:"stream_name,omitempty"`
	OutputName string `json:"output_name"`
	PullFLV    string `json:"pull_flv"`
	PullRTMP   string `json:"pull_rtmp"`
	StartedAt  string `json:"started_at,omitempty"`
}

// Internal state for FFmpeg process tracking
type RecordingProcess struct {
	StreamName string
	StartTime  time.Time
}

type RelayProcess struct {
	StreamName string
	TargetURL  string
	StartTime  time.Time
}

type OutputProcess struct {
	StreamName string
	StartTime  time.Time
}

type PreviewProcess struct {
	StreamName  string
	PreviewName string
	StartTime   time.Time
}
