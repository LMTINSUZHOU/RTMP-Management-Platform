import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Table, Tag, message, Button, Modal, Input, Space, Typography } from 'antd'
import {
  VideoCameraOutlined,
  FileOutlined,
  LoadingOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  ForwardOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import type { StreamInfo, RelayInfo, OutputInfo } from '../types'
import * as api from '../api/client'

export default function Dashboard() {
  const navigate = useNavigate()
  const [streams, setStreams] = useState<StreamInfo[]>([])
  const [relay, setRelay] = useState<RelayInfo | null>(null)
  const [output, setOutput] = useState<OutputInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [relayModalOpen, setRelayModalOpen] = useState(false)
  const [relayStream, setRelayStream] = useState('')
  const [relayUrl, setRelayUrl] = useState('')
  const [relayPresets, setRelayPresets] = useState<string[]>([])
  const [recordingCount, setRecordingCount] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, r, recs, o, settings] = await Promise.all([
        api.getStreams(),
        api.getRelay(),
        api.getRecordings(),
        api.getOutput(),
        api.getSettings(),
      ])
      setStreams(s)
      setRelay(r)
      setRecordingCount(recs.length)
      setOutput(o)
      setRelayPresets(settings.relay_presets || [])
    } catch (err: any) {
      message.error(err?.message || '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 5000)
    return () => clearInterval(timer)
  }, [])

  const activeStreams = streams.filter(s => true) // all returned streams are active
  const recordingStreams = streams.filter(s => s.is_recording)

  const handleStartRelay = async () => {
    if (!relayStream || !relayUrl) {
      message.warning('请选择推流和目标地址')
      return
    }
    const ok = await api.startRelay(relayStream, relayUrl)
    if (ok) {
      message.success('转推已启动')
      setRelayModalOpen(false)
      fetchData()
    } else {
      message.error('启动转推失败')
    }
  }

  const handleStopRelay = async () => {
    const ok = await api.stopRelay()
    if (ok) {
      message.success('转推已停止')
      fetchData()
    }
  }

  const handleStartRecord = async (name: string) => {
    const ok = await api.startRecord(name)
    if (ok) {
      message.success(`开始录制: ${name}`)
      fetchData()
    } else {
      message.error('开始录制失败')
    }
  }

  const handleStopRecord = async (name: string) => {
    const ok = await api.stopRecord(name)
    if (ok) {
      message.success(`停止录制: ${name}`)
      fetchData()
    }
  }

  const handleSetOutput = async (name: string) => {
    try {
      await api.setOutput(name)
      message.success(`已切换输出源至: ${name}`)
      fetchData()
    } catch (err: any) {
      message.error(err?.message || '设置输出流失败')
    }
  }

  const handleStopOutput = async () => {
    try {
      await api.stopOutput()
      message.success('已停止输出流')
      fetchData()
    } catch (err: any) {
      message.error(err?.message || '停止输出流失败')
    }
  }

  const columns = [
    { title: '流名称', dataIndex: 'name', key: 'name' },
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
      title: '预览',
      key: 'preview',
      render: (_: any, r: StreamInfo) => (
        <Button
          size="small"
          type="link"
          icon={<PlayCircleOutlined />}
          onClick={() => navigate(`/player?url=${encodeURIComponent(r.flv_url)}&name=${encodeURIComponent(r.name)}`)}
        >
          播放
        </Button>
      ),
    },
    {
      title: '录制',
      key: 'record',
      render: (_: any, r: StreamInfo) =>
        r.is_recording ? (
          <Button size="small" danger onClick={() => handleStopRecord(r.name)}>
            停止
          </Button>
        ) : (
          <Button size="small" type="primary" ghost onClick={() => handleStartRecord(r.name)}>
            录制
          </Button>
        ),
    },
    {
      title: '输出',
      key: 'output',
      render: (_: any, r: StreamInfo) =>
        output?.is_active && output.stream_name === r.name ? (
          <Tag color="green">当前输出</Tag>
        ) : (
          <Button size="small" onClick={() => handleSetOutput(r.name)}>
            <LinkOutlined /> 设为输出
          </Button>
        ),
    },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃推流"
              value={activeStreams.length}
              prefix={<VideoCameraOutlined />}
              suffix="路"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="正在录制"
              value={recordingStreams.length}
              prefix={<LoadingOutlined />}
              suffix="路"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="录制文件"
              value={recordingCount}
              prefix={<FileOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="当前转推"
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Button icon={<ForwardOutlined />} onClick={() => setRelayModalOpen(true)}>
              设置转推
            </Button>
            {relay?.is_active && (
              <Button danger onClick={handleStopRelay}>停止转推</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        {relay?.is_active ? (
          <div>
            <Typography.Text strong>推流: </Typography.Text>
            <Tag color="blue">{relay.stream_name}</Tag>
            <Typography.Text strong style={{ marginLeft: 16 }}>目标: </Typography.Text>
            <Typography.Text code>{relay.target_url}</Typography.Text>
          </div>
        ) : (
          <Typography.Text type="secondary">当前没有活跃的转推</Typography.Text>
        )}
      </Card>

      <Card
        title="固定拉流输出"
        style={{ marginTop: 16 }}
        extra={
          output?.is_active && (
            <Button danger onClick={handleStopOutput}>停止输出</Button>
          )
        }
      >
        {output?.is_active ? (
          <Space direction="vertical" size={4}>
            <div>
              <Typography.Text strong>当前源: </Typography.Text>
              <Tag color="green">{output.stream_name}</Tag>
            </div>
            <div>
              <Typography.Text strong>拉流地址 (HTTP-FLV): </Typography.Text>
              <Typography.Text copyable code>{output.pull_flv}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>拉流地址 (RTMP): </Typography.Text>
              <Typography.Text copyable code>{output.pull_rtmp}</Typography.Text>
            </div>
          </Space>
        ) : (
          <Typography.Text type="secondary">
            未设置输出源，请在下方推流列表中选择一路流作为输出
          </Typography.Text>
        )}
      </Card>

      <Card title="活跃推流" style={{ marginTop: 16 }}>
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
            <Typography.Text>选择推流:</Typography.Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="输入推流名称"
              value={relayStream}
              onChange={e => setRelayStream(e.target.value)}
            />
            {streams.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {streams.filter(s => !s.is_recording || true).map(s => (
                  <Tag
                    key={s.name}
                    color={relayStream === s.name ? 'blue' : 'default'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setRelayStream(s.name)}
                  >
                    {s.name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Typography.Text>目标RTMP地址:</Typography.Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="rtmp://目标服务器/live/stream"
              value={relayUrl}
              onChange={e => setRelayUrl(e.target.value)}
            />
            {relayPresets.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>预设地址:</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  {relayPresets.map((p, i) => (
                    <Tag
                      key={i}
                      color={relayUrl === p ? 'blue' : 'default'}
                      style={{ cursor: 'pointer', marginBottom: 4 }}
                      onClick={() => setRelayUrl(p)}
                    >
                      {p}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Space>
      </Modal>
    </div>
  )
}
