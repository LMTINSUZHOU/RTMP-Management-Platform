package main

import (
	"os"
	"sync"
)

type Config struct {
	SRSAPIURL     string
	SRSStreamURL  string
	SRSHTTPFLVURL string
	RecordingsDir string
	ServerPort    string
}

type RuntimeSettings struct {
	mu           sync.RWMutex
	PublicFLVURL string   `json:"public_flv_url"`
	PublicRTMP   string   `json:"public_rtmp"`
	RelayPresets []string `json:"relay_presets"`
}

var runtimeSettings RuntimeSettings

func (s *RuntimeSettings) GetPublicFLVURL() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.PublicFLVURL
}

func (s *RuntimeSettings) GetPublicRTMP() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.PublicRTMP
}

func (s *RuntimeSettings) GetRelayPresets() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.RelayPresets == nil {
		return []string{}
	}
	return s.RelayPresets
}

func (s *RuntimeSettings) Update(flvURL, rtmp string, presets []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if flvURL != "" {
		s.PublicFLVURL = flvURL
	}
	if rtmp != "" {
		s.PublicRTMP = rtmp
	}
	if presets != nil {
		s.RelayPresets = presets
	}
}

func LoadConfig() Config {
	c := Config{
		SRSAPIURL:     getEnv("SRS_API_URL", "http://localhost:1985"),
		SRSStreamURL:  getEnv("SRS_STREAM_URL", "rtmp://localhost:1935/live"),
		SRSHTTPFLVURL: getEnv("SRS_HTTP_FLV_URL", "http://localhost:8080/live"),
		RecordingsDir: getEnv("RECORDINGS_DIR", "./recordings"),
		ServerPort:    getEnv("SERVER_PORT", "8081"),
	}

	runtimeSettings = RuntimeSettings{
		PublicFLVURL: getEnv("PUBLIC_FLV_URL", "/live"),
		PublicRTMP:   getEnv("PUBLIC_RTMP_URL", "rtmp://localhost:1935/live"),
	}

	return c
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
