export interface StreamInfo {
  name: string
  app: string
  url: string
  flv_url: string
  client_id: string
  is_recording: boolean
  recording_since?: string
}

export interface RecordingInfo {
  file_name: string
  file_path: string
  stream_name: string
  size_bytes: number
  start_time: string
  duration?: string
}

export interface RelayInfo {
  stream_name: string
  target_url: string
  is_active: boolean
  started_at?: string
}

export interface OutputInfo {
  is_active: boolean
  stream_name?: string
  output_name: string
  pull_flv: string
  pull_rtmp: string
  started_at?: string
}

export interface APIResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}
