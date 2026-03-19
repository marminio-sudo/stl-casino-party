// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CheckIn from './pages/CheckIn'
import Admin from './pages/Admin'
import EventList from './pages/EventList'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest check-in — linked from QR code */}
        <Route path="/event/:eventId" element={<CheckIn />} />

        {/* Admin dashboard for a specific event */}
        <Route path="/admin/:eventId" element={<Admin />} />

        {/* Admin home — list all events, create new ones */}
        <Route path="/admin" element={<EventList />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin" />} />
      </Routes>
    </BrowserRouter>
  )
}
