# RTMP 推流管理平台

多路 RTMP 推流接入、浏览器实时预览、录制、转推的一站式管理平台。

## 功能

- **多路推流接入** — 支持任意数量设备通过 RTMP 推流
- **浏览器实时预览** — 内置 HTTP-FLV 播放器，自动检测 H.265 并转码为 H.264 播放
- **固定拉流输出** — 一个固定地址对外输出，可随时切换源流，拉流方无需改配置
- **录制管理** — 任意流启停录制，支持下载、重命名、删除
- **转推** — 选择一路流转推到外部 RTMP 地址，支持预设多个常用目标
- **Web 管理面板** — 实时状态监控，所有操作一键完成

## 技术栈

| 组件 | 技术 |
|------|------|
| 流媒体服务 | SRS 5.x |
| 后端 API | Go + Gin |
| 前端 | React + TypeScript + Ant Design |
| 转码/录制 | FFmpeg |
| 部署 | Docker Compose |

## 架构

```
设备 (RTMP) ──→ SRS ──→ Backend (Go/Gin) ──→ Web 管理面板 (React)
                 │            │
                 │            ├── FFmpeg 录制
                 │            ├── FFmpeg 转推
                 │            └── FFmpeg 转码 (H.265→H.264)
                 │
                 └── HTTP-FLV ──→ 浏览器播放 (mpegts.js)
```

## 快速开始

### 前置要求

- Docker & Docker Compose

### 启动

```bash
git clone https://github.com/yourname/rtmp.git
cd rtmp
docker compose up --build -d
```

### 访问

| 服务 | 地址 |
|------|------|
| 管理面板 | http://localhost:3000 |
| RTMP 推流 | rtmp://localhost:1935/live/{流名称} |
| HTTP-FLV 拉流 | http://localhost:3000/live/{流名称}.flv |

### 推流示例

**OBS Studio:**
- 服务器: `rtmp://你的IP:1935/live`
- 推流密钥: 自定义名称（如 `camera1`）

**FFmpeg 测试:**
```bash
ffmpeg -f lavfi -i testsrc2 -f lavfi -i sine \
  -c:v libx264 -c:a aac -f flv \
  rtmp://localhost:1935/live/test
```
