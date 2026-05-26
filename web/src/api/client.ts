import axios from 'axios'
import type { APIResponse, StreamInfo, RecordingInfo, RelayInfo, OutputInfo } from '../types'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

function handleResponse<T>(res: APIResponse<T>): T {
  if (!res.success) {
    throw new Error(res.message || '请求失败')
  }
  if (res.data === undefined || res.data === null) {
    throw new Error('返回数据为空')
  }
  return res.data
}

export async function getStreams(): Promise<StreamInfo[]> {
  const res = await http.get<APIResponse<StreamInfo[]>>('/streams')
  return handleResponse(res.data)
}

export async function getStream(name: string): Promise<StreamInfo | null> {
  const res = await http.get<APIResponse<StreamInfo>>(`/streams/${name}`)
  return handleResponse(res.data)
}

export async function startRecord(name: string): Promise<boolean> {
  const res = await http.post<APIResponse>(`/streams/${name}/record`)
  return handleResponse(res.data)
}

export async function stopRecord(name: string): Promise<boolean> {
  const res = await http.delete<APIResponse>(`/streams/${name}/record`)
  return handleResponse(res.data)
}

export async function getRelay(): Promise<RelayInfo> {
  const res = await http.get<APIResponse<RelayInfo>>('/relay')
  return handleResponse(res.data)
}

export async function startRelay(streamName: string, targetUrl: string): Promise<boolean> {
  const res = await http.post<APIResponse>('/relay', { stream_name: streamName, target_url: targetUrl })
  return handleResponse(res.data)
}

export async function stopRelay(): Promise<boolean> {
  const res = await http.delete<APIResponse>('/relay')
  return handleResponse(res.data)
}

export async function getRecordings(): Promise<RecordingInfo[]> {
  const res = await http.get<APIResponse<RecordingInfo[]>>('/recordings')
  return handleResponse(res.data)
}

export function getRecordingDownloadUrl(filePath: string): string {
  return `/api/recordings/download/${filePath}`
}

export interface Settings {
  public_flv_url: string
  public_rtmp: string
  relay_presets: string[]
}

export async function getSettings(): Promise<Settings> {
  const res = await http.get<APIResponse<Settings>>('/settings')
  return handleResponse(res.data)
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const res = await http.put<APIResponse<Settings>>('/settings', settings)
  return handleResponse(res.data)
}

export async function getOutput(): Promise<OutputInfo> {
  const res = await http.get<APIResponse<OutputInfo>>('/output')
  return handleResponse(res.data)
}

export async function setOutput(streamName: string): Promise<OutputInfo> {
  const res = await http.post<APIResponse<OutputInfo>>('/output', { stream_name: streamName })
  return handleResponse(res.data)
}

export async function stopOutput(): Promise<OutputInfo> {
  const res = await http.delete<APIResponse<OutputInfo>>('/output')
  return handleResponse(res.data)
}

export interface PreviewInfo {
  preview_name: string
  flv_url: string
}

export async function startPreview(name: string): Promise<PreviewInfo> {
  const res = await http.post<APIResponse<PreviewInfo>>(`/streams/${name}/preview`)
  return handleResponse(res.data)
}

export async function stopPreview(name: string): Promise<void> {
  await http.delete(`/streams/${name}/preview`)
}

export interface ProbeResult {
  video_codec: string
  need_transcode: boolean
}

export async function probeStream(name: string): Promise<ProbeResult> {
  const res = await http.get<APIResponse<ProbeResult>>(`/streams/${name}/probe`)
  return handleResponse(res.data)
}

export async function deleteRecording(filePath: string): Promise<void> {
  const res = await http.delete<APIResponse>(`/recordings/${filePath}`)
  handleResponse(res.data)
}

export async function renameRecording(filePath: string, newName: string): Promise<void> {
  const res = await http.put<APIResponse>(`/recordings/${filePath}`, { new_name: newName })
  handleResponse(res.data)
}
