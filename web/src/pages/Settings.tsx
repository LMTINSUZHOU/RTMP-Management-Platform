import { useState, useEffect } from 'react'
import { Card, Descriptions, Typography, Input, Button, Space, message } from 'antd'
import {
  InfoCircleOutlined,
  ApiOutlined,
  CameraOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ForwardOutlined,
} from '@ant-design/icons'
import * as api from '../api/client'

export default function Settings() {
  const [flvUrl, setFlvUrl] = useState('')
  const [rtmpUrl, setRtmpUrl] = useState('')
  const [relayPresets, setRelayPresets] = useState<string[]>([])
  const [newPreset, setNewPreset] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getSettings()
      .then(s => {
        setFlvUrl(s.public_flv_url)
        setRtmpUrl(s.public_rtmp)
        setRelayPresets(s.relay_presets || [])
      })
      .catch(() => message.error('获取设置失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateSettings({
        public_flv_url: flvUrl,
        public_rtmp: rtmpUrl,
        relay_presets: relayPresets,
      })
      setFlvUrl(updated.public_flv_url)
      setRtmpUrl(updated.public_rtmp)
      setRelayPresets(updated.relay_presets || [])
      message.success('设置已保存')
    } catch (err: any) {
      message.error(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const addPreset = () => {
    if (!newPreset) return
    if (relayPresets.includes(newPreset)) {
      message.warning('地址已存在')
      return
    }
    setRelayPresets([...relayPresets, newPreset])
    setNewPreset('')
  }

  const removePreset = (index: number) => {
    setRelayPresets(relayPresets.filter((_, i) => i !== index))
  }

  return (
    <div>
      <Card
        title={<span><ApiOutlined /> 公网地址配置</span>}
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text strong>HTTP-FLV 预览地址前缀</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              浏览器访问的 FLV 播放地址，格式: http://你的IP:8080/live
            </Typography.Text>
            <Input
              value={flvUrl}
              onChange={e => setFlvUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080/live"
              disabled={loading}
            />
          </div>
          <div>
            <Typography.Text strong>RTMP 推流地址前缀</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              设备推流使用的 RTMP 地址，格式: rtmp://你的IP:1935/live
            </Typography.Text>
            <Input
              value={rtmpUrl}
              onChange={e => setRtmpUrl(e.target.value)}
              placeholder="rtmp://192.168.1.100:1935/live"
              disabled={loading}
            />
          </div>
        </Space>
      </Card>

      <Card title={<span><ForwardOutlined /> 转推预设地址</span>} style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          预设常用的转推目标地址，在转推时可快速选择
        </Typography.Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          {relayPresets.map((preset, i) => (
            <Space key={i} style={{ width: '100%' }}>
              <Input value={preset} readOnly style={{ width: 400 }} />
              <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removePreset(i)} />
            </Space>
          ))}
          <Space>
            <Input
              value={newPreset}
              onChange={e => setNewPreset(e.target.value)}
              placeholder="rtmp://目标服务器/live/stream"
              style={{ width: 400 }}
              onPressEnter={addPreset}
            />
            <Button icon={<PlusOutlined />} onClick={addPreset}>添加</Button>
          </Space>
        </Space>
      </Card>

      <Card title={<span><CameraOutlined /> 推流方式</span>} style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="OBS Studio">
            设置 → 推流 → 服务器: {rtmpUrl || 'rtmp://IP:1935/live'} → 推流密钥: 自定义流名称
          </Descriptions.Item>
          <Descriptions.Item label="FFmpeg 测试推流">
            <Typography.Text code copyable>
              {`ffmpeg -f lavfi -i testsrc2 -f lavfi -i sine -c:v libx264 -c:a aac -f flv ${rtmpUrl || 'rtmp://IP:1935/live'}/test`}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={<span><InfoCircleOutlined /> 系统信息</span>}>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="版本">1.0.0</Descriptions.Item>
          <Descriptions.Item label="流媒体服务">SRS 5.x</Descriptions.Item>
          <Descriptions.Item label="转推说明">
            每次只允许转推 1 路流，切换时自动停止前一路
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
