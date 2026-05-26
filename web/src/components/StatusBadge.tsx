import { Tag } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'

interface Props {
  isActive: boolean
  isRecording?: boolean
}

export default function StatusBadge({ isActive, isRecording }: Props) {
  return (
    <span>
      <Tag
        icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        color={isActive ? 'success' : 'error'}
      >
        {isActive ? '推流中' : '离线'}
      </Tag>
      {isRecording && (
        <Tag icon={<LoadingOutlined />} color="processing">
          录制中
        </Tag>
      )}
    </span>
  )
}
