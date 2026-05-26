import { useState, useEffect } from 'react'
import { Table, Button, Tag, message, Card, Typography, Space, Input, Popconfirm, Modal } from 'antd'
import { DownloadOutlined, ReloadOutlined, SearchOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { RecordingInfo } from '../types'
import * as api from '../api/client'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function Recordings() {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [renameModal, setRenameModal] = useState(false)
  const [renameTarget, setRenameTarget] = useState<RecordingInfo | null>(null)
  const [newName, setNewName] = useState('')

  const fetchRecordings = async () => {
    setLoading(true)
    try {
      const data = await api.getRecordings()
      setRecordings(data)
    } catch {
      message.error('获取录制列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordings()
  }, [])

  const filtered = recordings.filter(r =>
    !search || r.stream_name.includes(search) || r.file_name.includes(search)
  )

  const handleDelete = async (filePath: string) => {
    try {
      await api.deleteRecording(filePath)
      message.success('已删除')
      fetchRecordings()
    } catch (err: any) {
      message.error(err?.message || '删除失败')
    }
  }

  const openRename = (record: RecordingInfo) => {
    setRenameTarget(record)
    setNewName(record.file_name)
    setRenameModal(true)
  }

  const handleRename = async () => {
    if (!renameTarget || !newName) return
    try {
      await api.renameRecording(renameTarget.file_path, newName)
      message.success('已重命名')
      setRenameModal(false)
      fetchRecordings()
    } catch (err: any) {
      message.error(err?.message || '重命名失败')
    }
  }

  const columns = [
    {
      title: '流名称',
      dataIndex: 'stream_name',
      key: 'stream_name',
      render: (name: string) => <Tag>{name}</Tag>,
    },
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
    },
    {
      title: '文件大小',
      dataIndex: 'size_bytes',
      key: 'size',
      render: (bytes: number) => formatSize(bytes),
      sorter: (a: RecordingInfo, b: RecordingInfo) => a.size_bytes - b.size_bytes,
    },
    {
      title: '录制时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (t: string) => new Date(t).toLocaleString(),
      sorter: (a: RecordingInfo, b: RecordingInfo) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, r: RecordingInfo) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            href={api.getRecordingDownloadUrl(r.file_path)}
            target="_blank"
          >
            下载
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openRename(r)}>
            改名
          </Button>
          <Popconfirm title="确定删除此录制文件？" onConfirm={() => handleDelete(r.file_path)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
    <Card
      title="录制管理"
      extra={
        <Space>
          <Input
            placeholder="搜索流名称"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchRecordings} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      {filtered.length === 0 && !loading ? (
        <Typography.Text type="secondary">暂无录制文件</Typography.Text>
      ) : (
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="file_path"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      )}
    </Card>

    <Modal
      title="重命名录制文件"
      open={renameModal}
      onOk={handleRename}
      onCancel={() => setRenameModal(false)}
    >
      <Input
        value={newName}
        onChange={e => setNewName(e.target.value)}
        placeholder="输入新文件名"
      />
    </Modal>
    </>
  )
}
