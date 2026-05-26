import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Tag, message, Space, Card, Modal, Input, Typography, Popconfirm } from 'antd'
import {
  PlayCircleOutlined,
  ReloadOutlined,
  ForwardOutlined,
} from '@ant-design/icons'
import type { StreamInfo } from '../types'
import * as api from '../api/client'

export default function Streams() {
  const navigate = useNavigate()
  const [streams, setStreams] = useState<StreamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [relayModalOpen, setRelayModalOpen] = useState(false)
  const [relayStream, setRelayStream] = useState('')
  const [relayUrl, setRelayUrl] = useState('')

  const fetchStreams = async () => {
    setLoading(true)
    try {
      const data = await api.getStreams()
      setStreams(data)
    } catch (err: any) {
      message.error(err?.message || '获取推流列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStreams()
    const timer = setInterval(fetchStreams, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleStartRecord = async (name: string) => {
    const ok = await api.startRecord(name)
    if (ok) {
      message.success(`开始录制: ${name}`)
      fetchStreams()
    }
  }

  const handleStopRecord = async (name: string) => {
    const ok = await api.stopRecord(name)
    if (ok) {
      message.success(`停止录制: ${name}`)
      fetchStreams()
    }
  }

  const openRelayModal = (streamName: string) => {
    setRelayStream(streamName)
    setRelayModalOpen(true)
  }

  const handleStartRelay = async () => {
    if (!relayStream || !relayUrl) {
      message.warning('请填写完整信息')
      return
    }
    const ok = await api.startRelay(relayStream, relayUrl)
    if (ok) {
      message.success(`已转推: ${relayStream}`)
      setRelayModalOpen(false)
    }
  }

  const columns = [
    {
      title: '流名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    {
      title: '应用',
      dataIndex: 'app',
      key: 'app',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, r: StreamInfo) => (
        <Tag color={r.is_recording ? 'processing' : 'success'}>
          {r.is_recording ? '录制中' : '推流中'}
        </Tag>
      ),
    },
    {
      title: '录制',
      key: 'record',
      render: (_: any, r: StreamInfo) =>
        r.is_recording ? (
          <Popconfirm title="确定停止录制？" onConfirm={() => handleStopRecord(r.name)}>
            <Button size="small" danger>停止录制</Button>
          </Popconfirm>
        ) : (
          <Button size="small" type="primary" ghost onClick={() => handleStartRecord(r.name)}>
            开始录制
          </Button>
        ),
    },
    {
      title: '转推',
      key: 'relay',
      render: (_: any, r: StreamInfo) => (
        <Button size="small" icon={<ForwardOutlined />} onClick={() => openRelayModal(r.name)}>
          转推
        </Button>
      ),
    },
    {
      title: '预览',
      key: 'preview',
      render: (_: any, r: StreamInfo) => (
        <Button
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => navigate(`/player?url=${encodeURIComponent(r.flv_url)}&name=${encodeURIComponent(r.name)}`)}
        >
          播放
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="推流列表"
        extra={<Button icon={<ReloadOutlined />} onClick={fetchStreams} loading={loading}>刷新</Button>}
      >
        <Table
          dataSource={streams}
          columns={columns}
          rowKey="name"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无活跃推流' }}
        />
      </Card>

      <Modal
        title="设置转推"
        open={relayModalOpen}
        onOk={handleStartRelay}
        onCancel={() => setRelayModalOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text>推流名称:</Typography.Text>
            <Input style={{ marginTop: 4 }} value={relayStream} disabled />
          </div>
          <div>
            <Typography.Text>目标RTMP地址:</Typography.Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="rtmp://目标服务器/live/stream"
              value={relayUrl}
              onChange={e => setRelayUrl(e.target.value)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              转推将自动停止当前转推，只保留这一路
            </Typography.Text>
          </div>
        </Space>
      </Modal>
    </div>
  )
}
