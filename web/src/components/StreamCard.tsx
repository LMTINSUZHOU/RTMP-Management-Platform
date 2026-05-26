import { Card, Button, Space, Typography, Tag, Spin } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  VideoCameraOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useState, useRef, useEffect } from 'react'
import type { StreamInfo } from '../types'

interface Props {
  stream: StreamInfo
  onStartRecord: (name: string) => void
  onStopRecord: (name: string) => void
  onStartRelay?: (name: string) => void
}

export default function StreamCard({ stream, onStartRecord, onStopRecord, onStartRelay }: Props) {
  const [showPlayer, setShowPlayer] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!showPlayer || !videoRef.current) return

    setLoading(true)
    // Use native MSE for HTTP-FLV playback
    // In production, consider using flv.js for better FLV support
    videoRef.current.src = stream.flv_url
    videoRef.current.onloadeddata = () => setLoading(false)

    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
    }
  }, [showPlayer, stream.flv_url])

  return (
    <Card
      title={
        <Space>
          <VideoCameraOutlined />
          <span>{stream.name}</span>
          <Tag color={stream.is_recording ? 'processing' : 'default'}>
            {stream.is_recording ? '录制中' : '闲置'}
          </Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {showPlayer && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin indicator={<LoadingOutlined spin />} size="large" />
              <p style={{ marginTop: 8, color: '#999' }}>加载播放器中...</p>
            </div>
          )}
          <video
            ref={videoRef}
            controls
            autoPlay
            muted
            style={{
              width: '100%',
              maxHeight: 300,
              borderRadius: 8,
              display: loading ? 'none' : 'block',
              background: '#000',
            }}
          />
        </div>
      )}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text code copyable>
          RTMP: rtmp://host:1935/live/{stream.name}
        </Typography.Text>
        <Space>
          <Button
            size="small"
            icon={showPlayer ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setShowPlayer(!showPlayer)}
          >
            {showPlayer ? '关闭预览' : '预览'}
          </Button>
          {stream.is_recording ? (
            <Button size="small" danger onClick={() => onStopRecord(stream.name)}>
              停止录制
            </Button>
          ) : (
            <Button size="small" type="primary" onClick={() => onStartRecord(stream.name)}>
              开始录制
            </Button>
          )}
          {onStartRelay && (
            <Button size="small" onClick={() => onStartRelay(stream.name)}>
              转推此路
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  )
}
