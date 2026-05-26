import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Typography } from 'antd'
import {
  DashboardOutlined,
  CameraOutlined,
  FileOutlined,
  SettingOutlined,
  PlaySquareOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = AntLayout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '总览' },
  { key: '/streams', icon: <CameraOutlined />, label: '推流列表' },
  { key: '/recordings', icon: <FileOutlined />, label: '录制管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" collapsible>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PlaySquareOutlined style={{ fontSize: 24, color: '#fff' }} />
          <Typography.Text style={{ color: '#fff', fontSize: 16, marginLeft: 8, fontWeight: 'bold' }}>
            推流管理
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            推流管理平台
          </Typography.Title>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
