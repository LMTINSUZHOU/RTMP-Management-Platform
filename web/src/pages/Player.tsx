import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Typography, Tag, Spin } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import mpegts from 'mpegts.js'
import * as api from '../api/client'

export default function Player() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<mpegts.Player | null>(null)
  const [status, setStatus] = useState<'transcoding' | 'connecting' | 'playing' | 'error'>('transcoding')
  const [errorMsg, setErrorMsg] = useState('')
  const [playUrl, setPlayUrl] = useState('')

  const url = searchParams.get('url') || ''
  const name = searchParams.get('name') || '未知'

  const destroyPlayer = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause()
        playerRef.current.unload()
        playerRef.current.detachMediaElement()
        playerRef.current.destroy()
      } catch (_) {}
      playerRef.current = null
    }
  }

  const startPlayback = (flvUrl: string) => {
    if (!videoRef.current) return
    if (!mpegts.isSupported()) {
      setStatus('error')
      setErrorMsg('当前浏览器不支持 HTTP-FLV 播放')
      return
    }

    destroyPlayer()
    setStatus('connecting')

    const absoluteUrl = flvUrl.startsWith('/')
      ? `${window.location.origin}${flvUrl}` : flvUrl

    const player = mpegts.createPlayer({
      type: 'flv',
      url: absoluteUrl,
      isLive: true,
    }, {
      enableWorker: true,
      enableStashBuffer: true,
      stashInitialSize: 256,
      lazyLoad: false,
    })

    player.attachMediaElement(videoRef.current)
    player.load()

    player.on(mpegts.Events.ERROR, (type, detail, info) => {
      console.error('mpegts error:', type, detail, info)
      setStatus('error')
      setErrorMsg(`${detail || type}: ${info?.msg || '播放出错'}`)
    })

    player.on(mpegts.Events.LOADING_COMPLETE, () => {
      setStatus('error')
      setErrorMsg('流已断开')
    })

    playerRef.current = player

    const video = videoRef.current
    video.addEventListener('canplay', () => {
      video.play().then(() => setStatus('playing')).catch(() => setStatus('playing'))
    }, { once: true })
  }

  useEffect(() => {
    if (!name || name === '未知') return

    let cancelled = false

    const init = async () => {
      setStatus('transcoding')
      setErrorMsg('')
      try {
        // Probe codec first
        const probe = await api.probeStream(name)
        if (cancelled) return

        if (probe.need_transcode) {
          // H.265: need transcode
          const preview = await api.startPreview(name)
          if (cancelled) return
          const flvUrl = preview.flv_url
          setPlayUrl(flvUrl)
          await new Promise(r => setTimeout(r, 2500))
          if (cancelled) return
          startPlayback(flvUrl)
        } else {
          // H.264: play directly
          setPlayUrl(url)
          startPlayback(url)
        }
      } catch (err: any) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg('启动预览失败: ' + (err?.message || '未知错误'))
      }
    }

    init()

    return () => {
      cancelled = true
      destroyPlayer()
      api.stopPreview(name).catch(() => {})
    }
  }, [name])

  const handleReload = () => {
    destroyPlayer()
    if (playUrl) {
      setStatus('connecting')
      setErrorMsg('')
      startPlayback(playUrl)
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Typography.Text strong>预览: {name}</Typography.Text>
        <Tag color={
          status === 'playing' ? 'green' :
          status === 'error' ? 'red' :
          status === 'transcoding' ? 'orange' : 'blue'
        }>
          {status === 'playing' ? '播放中' :
           status === 'error' ? '错误' :
           status === 'transcoding' ? '转码中' : '连接中'}
        </Tag>
        <Button icon={<ReloadOutlined />} size="small" onClick={handleReload}
          disabled={status === 'transcoding'}>
          重新加载
        </Button>
      </Space>

      <Card>
        {status === 'transcoding' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Typography.Text type="secondary">
                正在启动 H.265→H.264 转码，请稍候...
              </Typography.Text>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          controls
          muted
          playsInline
          style={{
            width: '100%',
            maxHeight: '70vh',
            background: '#000',
            display: status === 'transcoding' ? 'none' : 'block',
          }}
        />
        {status === 'error' && (
          <Typography.Text type="danger" style={{ display: 'block', marginTop: 8 }}>
            {errorMsg}
          </Typography.Text>
        )}
        {playUrl && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text type="secondary">转码后地址: </Typography.Text>
            <Typography.Text copyable code>{playUrl}</Typography.Text>
          </div>
        )}
      </Card>
    </div>
  )
}
