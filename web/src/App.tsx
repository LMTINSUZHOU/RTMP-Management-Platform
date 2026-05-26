import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Streams from './pages/Streams'
import Recordings from './pages/Recordings'
import Settings from './pages/Settings'
import Player from './pages/Player'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/streams" element={<Streams />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/player" element={<Player />} />
      </Route>
    </Routes>
  )
}

export default App
