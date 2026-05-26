package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type FFmpegManager struct {
	mu              sync.RWMutex
	recordings      map[string]*RecordingProcess
	previews        map[string]*PreviewProcess
	relay           *RelayProcess
	output          *OutputProcess
	recordingsDir   string
	srsStreamURL    string
	outputName      string
}

func NewFFmpegManager(recordingsDir, srsStreamURL string) *FFmpegManager {
	return &FFmpegManager{
		recordings:    make(map[string]*RecordingProcess),
		previews:      make(map[string]*PreviewProcess),
		recordingsDir: recordingsDir,
		srsStreamURL:  srsStreamURL,
		outputName:    "output",
	}
}

func (m *FFmpegManager) StartRecording(streamName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.recordings[streamName]; exists {
		return fmt.Errorf("already recording stream: %s", streamName)
	}

	streamDir := filepath.Join(m.recordingsDir, streamName)
	if err := os.MkdirAll(streamDir, 0755); err != nil {
		return fmt.Errorf("failed to create recording directory: %w", err)
	}

	timestamp := time.Now().Format("20060102_150405")
	outputPath := filepath.Join(streamDir, fmt.Sprintf("%s.mp4", timestamp))
	inputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, streamName)

	cmd := exec.Command("ffmpeg",
		"-i", inputURL,
		"-c", "copy",
		"-f", "mp4",
		"-y",
		outputPath,
	)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg recording: %w", err)
	}

	m.recordings[streamName] = &RecordingProcess{
		StreamName: streamName,
		StartTime:  time.Now(),
	}

	go func() {
		cmd.Wait()
		m.mu.Lock()
		delete(m.recordings, streamName)
		m.mu.Unlock()
	}()

	return nil
}

func (m *FFmpegManager) StopRecording(streamName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	_, exists := m.recordings[streamName]
	if !exists {
		return fmt.Errorf("no active recording for stream: %s", streamName)
	}

	// Find and kill the ffmpeg process
	killCmd := exec.Command("pkill", "-f", fmt.Sprintf("ffmpeg.*%s/%s", m.srsStreamURL, streamName))
	killCmd.Run()

	delete(m.recordings, streamName)

	return nil
}

func (m *FFmpegManager) IsRecording(streamName string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, exists := m.recordings[streamName]
	return exists
}

func (m *FFmpegManager) GetRecordingStartTime(streamName string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if r, exists := m.recordings[streamName]; exists {
		return r.StartTime.Format(time.RFC3339)
	}
	return ""
}

func (m *FFmpegManager) ListRecordings() ([]RecordingInfo, error) {
	entries, err := os.ReadDir(m.recordingsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []RecordingInfo{}, nil
		}
		return nil, err
	}

	recordings := make([]RecordingInfo, 0)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		streamDir := filepath.Join(m.recordingsDir, entry.Name())
		files, err := os.ReadDir(streamDir)
		if err != nil {
			continue
		}
		for _, f := range files {
			if f.IsDir() {
				continue
			}
			info, err := f.Info()
			if err != nil {
				continue
			}
			// Format file name: remove .mp4 extension for display
			recordings = append(recordings, RecordingInfo{
				FileName:   f.Name(),
				FilePath:   filepath.Join(entry.Name(), f.Name()),
				StreamName: entry.Name(),
				SizeBytes:  info.Size(),
				StartTime:  info.ModTime().Format(time.RFC3339),
			})
		}
	}
	return recordings, nil
}

func (m *FFmpegManager) StartRelay(streamName, targetURL string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Stop existing relay if any
	if m.relay != nil {
		killCmd := exec.Command("pkill", "-f", fmt.Sprintf("ffmpeg.*relay.*%s", m.relay.StreamName))
		killCmd.Run()
	}

	inputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, streamName)

	cmd := exec.Command("ffmpeg",
		"-i", inputURL,
		"-c", "copy",
		"-f", "flv",
		targetURL,
	)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg relay: %w", err)
	}

	m.relay = &RelayProcess{
		StreamName: streamName,
		TargetURL:  targetURL,
		StartTime:  time.Now(),
	}

	go func() {
		cmd.Wait()
		m.mu.Lock()
		m.relay = nil
		m.mu.Unlock()
	}()

	return nil
}

func (m *FFmpegManager) StopRelay() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.relay == nil {
		return fmt.Errorf("no active relay")
	}

	killCmd := exec.Command("pkill", "-f", fmt.Sprintf("ffmpeg.*relay.*%s", m.relay.StreamName))
	killCmd.Run()
	m.relay = nil
	return nil
}

func (m *FFmpegManager) GetRelay() *RelayInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.relay == nil {
		return &RelayInfo{IsActive: false}
	}

	return &RelayInfo{
		StreamName: m.relay.StreamName,
		TargetURL:  m.relay.TargetURL,
		IsActive:   true,
		StartedAt:  m.relay.StartTime.Format(time.RFC3339),
	}
}

func (m *FFmpegManager) StartOutput(streamName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.output != nil {
		killCmd := exec.Command("pkill", "-f", fmt.Sprintf("ffmpeg.*%s/%s.*%s/%s", m.srsStreamURL, m.output.StreamName, m.srsStreamURL, m.outputName))
		killCmd.Run()
		time.Sleep(500 * time.Millisecond)
	}

	inputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, streamName)
	outputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, m.outputName)

	cmd := exec.Command("ffmpeg",
		"-i", inputURL,
		"-c", "copy",
		"-f", "flv",
		outputURL,
	)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start output stream: %w", err)
	}

	m.output = &OutputProcess{
		StreamName: streamName,
		StartTime:  time.Now(),
	}

	go func() {
		cmd.Wait()
		m.mu.Lock()
		m.output = nil
		m.mu.Unlock()
	}()

	return nil
}

func (m *FFmpegManager) StopOutput() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.output == nil {
		return fmt.Errorf("no active output")
	}

	killCmd := exec.Command("pkill", "-f", fmt.Sprintf("ffmpeg.*%s/%s.*%s/%s", m.srsStreamURL, m.output.StreamName, m.srsStreamURL, m.outputName))
	killCmd.Run()
	m.output = nil
	return nil
}

func (m *FFmpegManager) GetOutput() *OutputInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	info := &OutputInfo{
		OutputName: m.outputName,
		PullFLV:    fmt.Sprintf("%s/%s.flv", runtimeSettings.GetPublicFLVURL(), m.outputName),
		PullRTMP:   fmt.Sprintf("%s/%s", runtimeSettings.GetPublicRTMP(), m.outputName),
	}

	if m.output == nil {
		info.IsActive = false
		return info
	}

	info.IsActive = true
	info.StreamName = m.output.StreamName
	info.StartedAt = m.output.StartTime.Format(time.RFC3339)
	return info
}

func (m *FFmpegManager) StartPreview(streamName string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	previewName := streamName + "_preview"

	if p, exists := m.previews[streamName]; exists {
		return p.PreviewName, nil
	}

	inputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, streamName)
	outputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, previewName)

	cmd := exec.Command("ffmpeg",
		"-i", inputURL,
		"-c:v", "libx264",
		"-preset", "ultrafast",
		"-tune", "zerolatency",
		"-profile:v", "baseline",
		"-b:v", "1500k",
		"-maxrate", "1500k",
		"-bufsize", "3000k",
		"-c:a", "aac",
		"-b:a", "128k",
		"-f", "flv",
		outputURL,
	)

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start preview transcode: %w", err)
	}

	m.previews[streamName] = &PreviewProcess{
		StreamName:  streamName,
		PreviewName: previewName,
		StartTime:   time.Now(),
	}

	go func() {
		cmd.Wait()
		m.mu.Lock()
		delete(m.previews, streamName)
		m.mu.Unlock()
	}()

	return previewName, nil
}

func (m *FFmpegManager) StopPreview(streamName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	p, exists := m.previews[streamName]
	if !exists {
		return fmt.Errorf("no active preview for stream: %s", streamName)
	}

	killCmd := exec.Command("pkill", "-f",
		fmt.Sprintf("ffmpeg.*%s/%s.*%s/%s", m.srsStreamURL, streamName, m.srsStreamURL, p.PreviewName))
	killCmd.Run()
	delete(m.previews, streamName)
	return nil
}

func (m *FFmpegManager) GetPreviewName(streamName string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, exists := m.previews[streamName]; exists {
		return p.PreviewName
	}
	return ""
}

func (m *FFmpegManager) ProbeCodec(streamName string) (string, error) {
	inputURL := fmt.Sprintf("%s/%s", m.srsStreamURL, streamName)

	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-rtmp_live", "live",
		"-analyzeduration", "5000000",
		"-probesize", "5000000",
		"-select_streams", "v:0",
		"-show_entries", "stream=codec_name",
		"-of", "csv=p=0",
		inputURL,
	)

	var stderr strings.Builder
	cmd.Stderr = &stderr

	output, err := cmd.Output()
	if err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg != "" {
			return "", fmt.Errorf("ffprobe: %s", errMsg)
		}
		return "", fmt.Errorf("ffprobe failed: %w", err)
	}

	codec := strings.TrimSpace(string(output))
	if codec == "" {
		return "", fmt.Errorf("could not detect codec")
	}
	return codec, nil
}
