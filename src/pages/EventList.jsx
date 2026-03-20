// src/pages/EventList.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'

const ADMIN_PIN = '1234'

export default function EventList() {
  const navigate = useNavigate()
  const [pin, setPin]       = useState('')
  const [authed, setAuthed] = useState(localStorage.getItem('admin_authed') === 'true')
  const [events, setEvents] = useState([])
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState('active') // 'active' | 'archived'
  const [form, setForm]     = useState({ name:'', event_date:'', starting_chips:1000, chips_per_ticket:250, is_fundraiser:false, raffle_enabled:true })
  const [qrCanvas, setQrCanvas] = useState(null)
  const [qrEventId, setQrEventId] = useState(null)

  function checkPin() { 
    if (pin === ADMIN_PIN) {
      setAuthed(true)
      localStorage.setItem('admin_authed', 'true')
    } else {
      setPin('')
    }
  }

  useEffect(() => { if (authed) loadEvents() }, [authed])

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false })
    setEvents(data || [])
  }

  async function createEvent() {
    if (!form.name) return
    const { data } = await supabase.from('events').insert(form).select().single()
    if (data) {
      setEvents(prev => [data, ...prev])
      setCreating(false)
      setForm({ name:'', event_date:'', starting_chips:1000, chips_per_ticket:250, is_fundraiser:false, raffle_enabled:true })
    }
  }

  async function showQR(eventId) {
    const url = `${window.location.origin}/event/${eventId}`
    setQrEventId(eventId)
    const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 })
    setQrCanvas(dataUrl)
  }

  async function toggleActive(id, current) {
    await supabase.from('events').update({ is_active: !current }).eq('id', id)
    loadEvents()
  }

  async function archiveEvent(id) {
    await supabase.from('events').update({ is_active: false, is_archived: true }).eq('id', id)
    loadEvents()
  }

  async function deleteEvent(id) {
    if (!window.confirm('Delete this event and all its guest data? This cannot be undone.')) return
    await supabase.from('events').delete().eq('id', id)
    loadEvents()
  }

  const filtered = events.filter(ev => view === 'archived' ? ev.is_archived : !ev.is_archived)

  if (!authed) return (
    <div style={s.app}>
      <div style={s.header}>
        <img src="/logo.png" alt="St. Louis Casino Party" style={{height:120, width:'auto'}} />
      </div>
      <div style={{...s.body, alignItems:'center', justifyContent:'center'}}>
        <div style={s.h1}>Admin Login</div>
        <input style={{...s.input, textAlign:'center', letterSpacing:8, fontSize:20, maxWidth:200, marginTop:16}}
          type="password" placeholder="PIN" value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key==='Enter' && checkPin()} />
        <button style={{...s.btnPrimary, maxWidth:200, marginTop:12}} onClick={checkPin}>Enter</button>
      </div>
    </div>
  )

  return (
    <div style={s.app}>
      <div style={s.header}>
        <img src="/logo.png" alt="St. Louis Casino Party" 
          style={{height:120, width:'auto', cursor:'pointer'}} 
          onClick={() => navigate('/admin')} />
        <button style={s.btnSecondary} onClick={() => setCreating(true)}>+ New Event</button>
      </div>

      <div style={s.body}>
        {creating && (
          <div style={s.card}>
            <div style={s.cardTitle}>New Event</div>
            <label style={s.lbl}>Event name</label>
            <input style={s.input} value={form.name} placeholder="Fundraiser Gala"
              onChange={e => setForm({...form, name:e.target.value})} />
            <label style={s.lbl}>Date</label>
            <input style={s.input} type="date" value={form.event_date}
              onChange={e => setForm({...form, event_date:e.target.value})} />
            <label style={s.lbl}>Starting chips</label>
            <input style={s.input} type="number" value={form.starting_chips}
              onChange={e => setForm({...form, starting_chips:parseInt(e.target.value)})} />
            <label style={s.lbl}>Chips per raffle ticket</label>
            <input style={s.input} type="number" value={form.chips_per_ticket}
              onChange={e => setForm({...form, chips_per_ticket:parseInt(e.target.value)})} />
            <div style={s.checkRow}>
              <input type="checkbox" id="fundraiser" checked={form.is_fundraiser}
                onChange={e => setForm({...form, is_fundraiser:e.target.checked})} />
              <label htmlFor="fundraiser" style={s.checkLabel}>Fundraiser mode (chip buy-ins enabled)</label>
            </div>
            <div style={s.checkRow}>
              <input type="checkbox" id="raffle" checked={form.raffle_enabled}
                onChange={e => setForm({...form, raffle_enabled:e.target.checked})} />
              <label htmlFor="raffle" style={s.checkLabel}>Raffle enabled</label>
            </div>
            <div style={{display:'flex', gap:10, marginTop:16}}>
              <button style={s.btnPrimary} onClick={createEvent}>Create Event</button>
              <button style={s.btnGhost} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        )}

        {qrCanvas && (
          <div style={s.card}>
            <div style={s.cardTitle}>QR Code</div>
            <div style={{textAlign:'center', marginBottom:12}}>
              <img src={qrCanvas} alt="QR code" style={{borderRadius:8, background:'#fff', padding:8}} />
              <div style={{fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:8}}>
                {window.location.origin}/event/{qrEventId}
              </div>
            </div>
            <div style={{display:'flex', gap:10}}>
              <a href={qrCanvas} download="casino-checkin-qr.png"
                style={{...s.btnPrimary, textAlign:'center', textDecoration:'none', display:'block', flex:1}}>
                Download PNG
              </a>
              <button style={s.btnGhost} onClick={() => { setQrCanvas(null); setQrEventId(null) }}>Close</button>
            </div>
          </div>
        )}

        <div style={s.viewToggle}>
          <div style={{...s.viewBtn, ...(view==='active' ? s.viewBtnActive : {})}} onClick={() => setView('active')}>Active</div>
          <div style={{...s.viewBtn, ...(view==='archived' ? s.viewBtnActive : {})}} onClick={() => setView('archived')}>Archived</div>
        </div>

        {filtered.length === 0 && <p style={s.muted}>{view === 'archived' ? 'No archived events.' : 'No events yet. Create one above.'}</p>}
        {filtered.map(ev => (
          <div key={ev.id} style={s.eventRow}>
            <div style={{flex:1}}>
              <div style={s.eventName}>{ev.name}</div>
              <div style={s.eventMeta}>
                {ev.event_date || 'No date'} &bull; {ev.starting_chips.toLocaleString()} chips
                {ev.is_fundraiser ? ' · Fundraiser' : ''}
                {ev.raffle_enabled ? ' · Raffle' : ''}
                {ev.is_archived ? ' · Archived' : ''}
              </div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
              {!ev.is_archived && <button style={s.btnSmall} onClick={() => navigate(`/admin/${ev.id}`)}>Dashboard</button>}
              {!ev.is_archived && <button style={s.btnSmall} onClick={() => showQR(ev.id)}>QR Code</button>}
              {!ev.is_archived && (
                <button style={s.btnSmall} onClick={() => archiveEvent(ev.id)}>Archive</button>
              )}
              <button style={{...s.btnSmall, color:'rgba(240,100,100,0.8)'}} onClick={() => deleteEvent(ev.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  app:         { minHeight:'100vh', background:'#1a1a1a', fontFamily:"'DM Sans',sans-serif", color:'#fff' },
  header:      { background:'#000', borderBottom:'0.5px solid rgba(201,168,76,0.2)', padding:'24px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  body:        { padding:24, display:'flex', flexDirection:'column', gap:4 },
  h1:          { fontFamily:"'Playfair Display',serif", fontSize:24, color:'#fff' },
  card:        { background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(201,168,76,0.2)', borderRadius:12, padding:18, marginBottom:16 },
  cardTitle:   { fontFamily:"'Playfair Display',serif", fontSize:18, color:'#fff', marginBottom:16 },
  lbl:         { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.6)', marginTop:12, marginBottom:6, display:'block' },
  input:       { width:'100%', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit', marginBottom:4 },
  checkRow:    { display:'flex', alignItems:'center', gap:10, padding:'8px 0' },
  checkLabel:  { fontSize:14, color:'rgba(255,255,255,0.7)' },
  btnPrimary:  { flex:1, background:'linear-gradient(135deg,#c9a84c,#a8832a)', border:'none', borderRadius:8, padding:'12px 16px', fontSize:14, fontWeight:500, color:'#1a0a00', cursor:'pointer', fontFamily:'inherit' },
  btnSecondary:{ background:'rgba(201,168,76,0.1)', border:'0.5px solid rgba(201,168,76,0.35)', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:500, color:'#c9a84c', cursor:'pointer', fontFamily:'inherit' },
  btnGhost:    { background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:13, cursor:'pointer', fontFamily:'inherit' },
  btnSmall:    { background:'rgba(255,255,255,0.07)', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:6, padding:'5px 12px', fontSize:12, color:'rgba(255,255,255,0.7)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' },
  muted:       { fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:8 },
  eventRow:    { display:'flex', alignItems:'flex-start', padding:'14px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)', gap:12 },
  eventName:   { fontSize:15, color:'#fff', marginBottom:4 },
  eventMeta:   { fontSize:12, color:'rgba(255,255,255,0.35)' },
  viewToggle:  { display:'flex', gap:8, margin:'8px 0 16px' },
  viewBtn:     { padding:'7px 18px', borderRadius:8, fontSize:13, cursor:'pointer', border:'0.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.45)', background:'none' },
  viewBtnActive:{ borderColor:'rgba(201,168,76,0.5)', color:'#c9a84c', background:'rgba(201,168,76,0.08)' },
}
