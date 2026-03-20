// src/pages/Admin.jsx
// Manager/admin dashboard — live data from Supabase
// URL: checkin.stlcasinoparty.com/admin/:eventId
// Protected by a simple PIN (replace with proper auth later)

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_PIN = '1234' // Change this! Or wire up Supabase Auth later.

export default function Admin() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [pin, setPin]         = useState('')
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState('guests')
  const [event, setEvent]     = useState(null)
  const [guests, setGuests]   = useState([])
  const [prizes, setPrizes]   = useState([])
  const [newPrize, setNewPrize] = useState('')
  const [drawResult, setDrawResult] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [drawLog, setDrawLog] = useState([])
  const [saving, setSaving]   = useState(false)

  // ── Auth ───────────────────────────────────────────────
  function checkPin() {
    if (pin === ADMIN_PIN) setAuthed(true)
    else setPin('')
  }

  // ── Load everything ────────────────────────────────────
  useEffect(() => {
    if (!authed) return
    loadEvent()
    loadGuests()
    loadPrizes()
  }, [authed, eventId])

  // ── Real-time guest updates ─────────────────────────────
  useEffect(() => {
    if (!authed) return
    const channel = supabase
      .channel('admin-guests-' + eventId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guests',
        filter: `event_id=eq.${eventId}`,
      }, () => loadGuests())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [authed, eventId])

  async function loadEvent() {
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single()
    setEvent(data)
  }

  async function loadGuests() {
    const { data } = await supabase
      .from('guest_leaderboard')
      .select('*')
      .eq('event_id', eventId)
    setGuests(data || [])
  }

  async function loadPrizes() {
    const { data } = await supabase.from('prizes').select('*').eq('event_id', eventId)
    setPrizes(data || [])
  }

  // ── Save event settings ────────────────────────────────
  async function saveEvent() {
    if (!event) return
    setSaving(true)
    await supabase.from('events').update({
      name:                event.name,
      starting_chips:      event.starting_chips,
      chips_per_ticket:    event.chips_per_ticket,
      is_fundraiser:       event.is_fundraiser,
      raffle_enabled:      event.raffle_enabled,
      leaderboard_visible: event.leaderboard_visible,
    }).eq('id', eventId)
    setSaving(false)
  }

  // ── Add prize ──────────────────────────────────────────
  async function addPrize() {
    if (!newPrize.trim()) return
    await supabase.from('prizes').insert({ event_id: eventId, name: newPrize.trim() })
    setNewPrize('')
    loadPrizes()
  }

  async function removePrize(id) {
    await supabase.from('prizes').delete().eq('id', id)
    loadPrizes()
  }

  // ── Draw winner ────────────────────────────────────────
  async function drawWinner(prizeId) {
    const prize = prizes.find(p => p.id === prizeId)
    if (!prize) return

    // Build ticket pool weighted by chip count
    const pool = []
    guests.forEach(g => {
      const tickets = Math.ceil(g.total_chips / (event?.chips_per_ticket || 250))
      for (let i = 0; i < tickets; i++) pool.push(g)
    })
    if (!pool.length) return

    setDrawing(true)
    setDrawResult(null)

    // Dramatic spin
    let frames = 0
    const interval = setInterval(async () => {
      frames++
      const preview = pool[Math.floor(Math.random() * pool.length)]
      setDrawResult({ name: preview.name, spinning: true })
      if (frames > 22) {
        clearInterval(interval)
        const winner = pool[Math.floor(Math.random() * pool.length)]
        // Save winner to DB
        await supabase.from('prizes')
          .update({ winner_guest_id: winner.id, drawn_at: new Date().toISOString() })
          .eq('id', prizeId)
        const entry = { winner: winner.name, prize: prize.name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        setDrawResult({ ...winner, spinning: false, prize: prize.name })
        setDrawLog(prev => [entry, ...prev])
        setDrawing(false)
        loadPrizes()
      }
    }, 90)
  }

  // ── Derived stats ──────────────────────────────────────
  const confirmed  = guests.filter(g => g.dealer_confirmed).length
  const buyinCount = guests.filter(g => (g.extra_chips || 0) > 0).length
  const totalTickets = guests.reduce((s, g) => s + Number(g.ticket_count || 0), 0)

  // ══════════════════════════════════════════════════════
  // RENDER — PIN GATE
  // ══════════════════════════════════════════════════════
  if (!authed) return (
    <div style={s.app}>
      <div style={s.header}>
        <img src="/logo.png" alt="St. Louis Casino Party" style={{height:120,width:'auto'}} />
      </div>
      <div style={{...s.body, alignItems:'center', justifyContent:'center', gap:12}}>
        <div style={{fontFamily:"'Playfair Display',serif", fontSize:22, color:'#fff', marginBottom:8}}>Manager Access</div>
        <input style={{...s.input, textAlign:'center', letterSpacing:8, fontSize:20, maxWidth:200}}
          type="password" placeholder="PIN" value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkPin()} />
        <button style={{...s.btnPrimary, maxWidth:200}} onClick={checkPin}>Enter</button>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════
  // RENDER — DASHBOARD
  // ══════════════════════════════════════════════════════
  return (
    <div style={s.app}>
      <div style={s.header}>
        <img src="/logo.png" alt="St. Louis Casino Party" 
          style={{height:120,width:'auto',cursor:'pointer'}} 
          onClick={() => navigate('/admin')} />
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:15,color:'#fff',marginBottom:4}}>{event?.name}</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',cursor:'pointer'}} onClick={() => navigate('/admin')}>← Back to events</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {['guests','raffle','setup'].map(t => (
          <div key={t} style={{...s.tab, ...(tab===t ? s.tabActive : {})}} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </div>
        ))}
      </div>

      {/* ── GUESTS TAB ── */}
      {tab === 'guests' && (
        <div style={s.body}>
          <div style={s.statGrid}>
            <Stat num={guests.length}  label="Checked in" />
            <Stat num={confirmed}      label="Confirmed" />
            <Stat num={buyinCount}     label="Buy-ins" />
            <Stat num={totalTickets}   label="Total tickets" />
          </div>

          <div style={s.sectionLabel}>Leaderboard</div>
          {guests.map((g, i) => (
            <div key={g.id} style={s.guestRow}>
              <div style={{...s.rank, color: i<3 ? '#c9a84c' : 'rgba(255,255,255,0.3)'}}>
                {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
              </div>
              <div style={s.guestInfo}>
                <div style={s.guestName}>{g.name}
                  {!g.dealer_confirmed && <span style={s.pendingBadge}>unconfirmed</span>}
                </div>
                <div style={s.guestPhone}>{g.phone}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={s.guestChips}>{Number(g.total_chips).toLocaleString()}</div>
                <div style={s.guestTickets}>{Number(g.ticket_count)} tickets</div>
              </div>
            </div>
          ))}
          {guests.length === 0 && <p style={s.muted}>No guests checked in yet.</p>}
        </div>
      )}

      {/* ── RAFFLE TAB ── */}
      {tab === 'raffle' && (
        <div style={s.body}>
          <div style={s.statCard}>
            <div style={s.chipLabel}>Total ticket pool</div>
            <div style={s.bigNum}>{totalTickets.toLocaleString()}</div>
            <div style={s.muted}>{guests.length} players</div>
          </div>

          <div style={s.sectionLabel}>Prizes</div>
          {prizes.map(p => (
            <div key={p.id} style={s.prizeRow}>
              <div style={{flex:1}}>
                <div style={s.prizeName}>{p.name}</div>
                {p.drawn_at && <div style={s.prizeWinner}>Winner: {guests.find(g=>g.id===p.winner_guest_id)?.name || '—'}</div>}
              </div>
              {!p.drawn_at ? (
                <button style={s.btnDraw} onClick={() => drawWinner(p.id)} disabled={drawing}>
                  {drawing ? 'Drawing...' : 'Draw'}
                </button>
              ) : (
                <span style={{fontSize:12,color:'rgba(76,175,80,0.8)'}}>Drawn ✓</span>
              )}
              {!p.drawn_at && <button style={s.btnDel} onClick={() => removePrize(p.id)}>×</button>}
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <input style={{...s.input,flex:1}} placeholder="Prize name" value={newPrize}
              onChange={e => setNewPrize(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addPrize()} />
            <button style={{...s.btnSecondary,width:'auto',padding:'0 16px'}} onClick={addPrize}>+ Add</button>
          </div>

          {drawResult && (
            <div style={s.drumCard}>
              {drawResult.spinning
                ? <div style={{fontSize:14,color:'rgba(201,168,76,0.7)'}}>Drawing...</div>
                : <>
                    <div style={s.chipLabel}>Winner</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:'#fff'}}>{drawResult.name}</div>
                    <div style={{fontSize:14,color:'rgba(255,255,255,0.45)',marginTop:4}}>{drawResult.prize}</div>
                  </>
              }
            </div>
          )}

          {drawLog.length > 0 && (
            <>
              <div style={s.sectionLabel}>Draw history</div>
              {drawLog.map((d,i) => (
                <div key={i} style={s.logRow}>
                  <span style={{color:'#c9a84c'}}>{d.winner}</span>
                  <span style={{color:'rgba(255,255,255,0.45)'}}>{d.prize}</span>
                  <span style={{color:'rgba(255,255,255,0.25)'}}>{d.time}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── SETUP TAB ── */}
      {tab === 'setup' && event && (
        <div style={s.body}>
          <div style={s.sectionLabel}>Event name</div>
          <input style={s.input} value={event.name} onChange={e => setEvent({...event, name:e.target.value})} />

          <div style={s.sectionLabel}>Starting chips per guest</div>
          <input style={s.input} type="number" value={event.starting_chips}
            onChange={e => setEvent({...event, starting_chips:parseInt(e.target.value)})} />

          <div style={s.sectionLabel}>Chips per raffle ticket</div>
          <input style={s.input} type="number" value={event.chips_per_ticket}
            onChange={e => setEvent({...event, chips_per_ticket:parseInt(e.target.value)})} />

          <Toggle label="Fundraiser mode (buy-ins enabled)" value={event.is_fundraiser}
            onChange={v => setEvent({...event, is_fundraiser:v})} />
          <Toggle label="Raffle enabled" value={event.raffle_enabled}
            onChange={v => setEvent({...event, raffle_enabled:v})} />
          <Toggle label="Leaderboard visible to guests" value={event.leaderboard_visible}
            onChange={v => setEvent({...event, leaderboard_visible:v})} />

          <button style={{...s.btnPrimary, marginTop:20}} onClick={saveEvent}>
            {saving ? 'Saving...' : 'Save Event Settings'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Small components ──────────────────────────────────
function Stat({ num, label }) {
  return (
    <div style={s.statTile}>
      <div style={s.statNum}>{num}</div>
      <div style={s.statLbl}>{label}</div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={s.toggleRow} onClick={() => onChange(!value)}>
      <span style={s.toggleLabel}>{label}</span>
      <div style={{...s.toggleTrack, background: value ? '#c9a84c' : 'rgba(255,255,255,0.12)'}}>
        <div style={{...s.toggleThumb, left: value ? 21 : 3}} />
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────
const s = {
  app:         { minHeight:'100vh', background:'#1a1a1a', fontFamily:"'DM Sans',sans-serif", color:'#fff' },
  header:      { background:'#000', borderBottom:'0.5px solid rgba(201,168,76,0.2)', padding:'24px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  logo:        { fontFamily:"'Playfair Display',serif", fontSize:17, color:'#c9a84c' },
  role:        { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginTop:2 },
  tabs:        { display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.08)', background:'#000' },
  tab:         { padding:'12px 18px', fontSize:13, color:'rgba(255,255,255,0.4)', cursor:'pointer', borderBottom:'2px solid transparent' },
  tabActive:   { color:'#c9a84c', borderBottomColor:'#c9a84c' },
  body:        { padding:20, display:'flex', flexDirection:'column', gap:0 },
  input:       { width:'100%', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit', marginBottom:4 },
  btnPrimary:  { width:'100%', background:'linear-gradient(135deg,#c9a84c,#a8832a)', border:'none', borderRadius:8, padding:14, fontSize:14, fontWeight:500, color:'#1a0a00', cursor:'pointer', fontFamily:'inherit' },
  btnSecondary:{ background:'rgba(201,168,76,0.1)', border:'0.5px solid rgba(201,168,76,0.35)', borderRadius:8, padding:'11px 18px', fontSize:13, fontWeight:500, color:'#c9a84c', cursor:'pointer', fontFamily:'inherit' },
  btnDraw:     { background:'rgba(201,168,76,0.15)', border:'0.5px solid rgba(201,168,76,0.4)', borderRadius:6, padding:'6px 14px', fontSize:12, color:'#c9a84c', cursor:'pointer', fontFamily:'inherit', flexShrink:0 },
  btnDel:      { background:'none', border:'none', color:'rgba(200,60,60,0.6)', cursor:'pointer', fontSize:18, padding:'0 4px', flexShrink:0 },
  muted:       { fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:8 },
  statGrid:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 },
  statTile:    { background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:10, padding:14 },
  statNum:     { fontFamily:"'Playfair Display',serif", fontSize:28, color:'#c9a84c' },
  statLbl:     { fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:4, letterSpacing:1, textTransform:'uppercase' },
  sectionLabel:{ fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.6)', marginTop:20, marginBottom:10 },
  guestRow:    { display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)' },
  rank:        { width:28, fontSize:13, flexShrink:0 },
  guestInfo:   { flex:1, paddingLeft:8 },
  guestName:   { fontSize:14, color:'#fff' },
  guestPhone:  { fontSize:12, color:'rgba(255,255,255,0.35)' },
  guestChips:  { fontSize:14, color:'#c9a84c', fontWeight:500 },
  guestTickets:{ fontSize:12, color:'rgba(255,255,255,0.35)' },
  pendingBadge:{ fontSize:10, background:'rgba(240,160,0,0.15)', color:'rgba(240,160,0,0.8)', borderRadius:4, padding:'1px 6px', marginLeft:6, letterSpacing:1 },
  prizeRow:    { display:'flex', alignItems:'center', gap:10, padding:'12px', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:8, marginBottom:8 },
  prizeName:   { fontSize:14, color:'#fff' },
  prizeWinner: { fontSize:12, color:'rgba(76,175,80,0.8)', marginTop:2 },
  drumCard:    { background:'rgba(0,0,0,0.4)', border:'0.5px solid rgba(201,168,76,0.3)', borderRadius:12, padding:28, textAlign:'center', marginTop:16 },
  bigNum:      { fontFamily:"'Playfair Display',serif", fontSize:40, color:'#c9a84c' },
  chipLabel:   { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.6)', marginBottom:8 },
  logRow:      { display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' },
  statCard:    { background:'rgba(201,168,76,0.07)', border:'0.5px solid rgba(201,168,76,0.25)', borderRadius:12, padding:18, marginBottom:4 },
  toggleRow:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)', cursor:'pointer' },
  toggleLabel: { fontSize:14, color:'rgba(255,255,255,0.7)' },
  toggleTrack: { width:40, height:22, borderRadius:11, position:'relative', transition:'background 0.2s', flexShrink:0 },
  toggleThumb: { position:'absolute', top:3, width:16, height:16, background:'#fff', borderRadius:'50%', transition:'left 0.2s' },
}
