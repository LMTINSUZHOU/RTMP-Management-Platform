package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type SRSClient struct {
	apiURL string
	client *http.Client
}

func NewSRSClient(apiURL string) *SRSClient {
	return &SRSClient{
		apiURL: apiURL,
		client: &http.Client{},
	}
}

func (c *SRSClient) GetStreams() ([]StreamInfo, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/v1/streams", c.apiURL))
	if err != nil {
		return nil, fmt.Errorf("连接 SRS 失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取 SRS 响应失败: %w", err)
	}

	var srsResp SRSStreamsResponse
	if err := json.Unmarshal(body, &srsResp); err != nil {
		return nil, fmt.Errorf("解析 SRS 响应失败: %w", err)
	}

	if srsResp.Code != 0 {
		return nil, fmt.Errorf("SRS 错误码: %d", srsResp.Code)
	}

	streams := make([]StreamInfo, 0)
	for _, s := range srsResp.Streams {
		name := s.Stream
		if name == "" {
			continue
		}
		flvURL := fmt.Sprintf("%s/%s.flv", runtimeSettings.GetPublicFLVURL(), name)
		streams = append(streams, StreamInfo{
			Name:     name,
			App:      s.App,
			FlvURL:   flvURL,
			ClientID: s.ClientID,
		})
	}
	return streams, nil
}

func (c *SRSClient) GetStreamCodec(streamName string) (string, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/v1/streams", c.apiURL))
	if err != nil {
		return "", fmt.Errorf("连接 SRS 失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取 SRS 响应失败: %w", err)
	}

	var raw struct {
		Code    int `json:"code"`
		Streams []struct {
			Name  string `json:"name"`
			Video struct {
				Codec string `json:"codec"`
			} `json:"video"`
		} `json:"streams"`
	}

	if err := json.Unmarshal(body, &raw); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	for _, s := range raw.Streams {
		if s.Name == streamName {
			codec := s.Video.Codec
			if codec == "" {
				return "unknown", nil
			}
			return codec, nil
		}
	}

	return "", fmt.Errorf("stream not found: %s", streamName)
}
