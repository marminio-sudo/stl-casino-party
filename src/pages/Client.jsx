// src/pages/Client.jsx
// Client dashboard — simplified event controls
// URL: checkin.stlcasinoparty.com/client/:eventId
// No PIN required

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Client() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [guests, setGuests] = useState([])
  const [prizes, setPrizes] = useState([])
  const [newPrize, setNewPrize] = useState('')
  const [drawResult, setDrawResult] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEvent()
    loadGuests()
    loadPrizes()
  }, [eventId])

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('client-guests-' + eventId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guests',
        filter: `event_id=eq.${eventId}`,
      }, () => loadGuests())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [eventId])

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

  async function saveEvent() {
    if (!event) return
    setSaving(true)
    await supabase.from('events').update({
      starting_chips: event.starting_chips,
      chips_per_ticket: event.chips_per_ticket,
      gameplay_mode: event.gameplay_mode || 'normal',
      ticket_cap: event.ticket_cap || null,
    }).eq('id', eventId)
    setSaving(false)
  }

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
        await supabase.from('prizes')
          .update({ winner_guest_id: winner.id, drawn_at: new Date().toISOString() })
          .eq('id', prizeId)
        setDrawResult({ ...winner, spinning: false, prize: prize.name })
        setDrawing(false)
        loadPrizes()
      }
    }, 90)
  }

  const totalTickets = guests.reduce((s, g) => s + Number(g.ticket_count || 0), 0)
  const topGuests = guests.slice(0, 10)

  if (!event) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.app}>
      <div style={s.header}>
        <img src="/logo.png" alt="St. Louis Casino Party" style={{height:100,width:'auto'}} />
        <div style={{textAlign:'right'}}>
          <div style={s.eventName}>{event.name}</div>
          <div style={s.eventDate}>{event.event_date || 'No date set'}</div>
        </div>
      </div>

      <div style={s.body}>
        {/* Event Settings */}
        <div style={s.card}>
          <div style={s.cardTitle}>Event Settings</div>
          
          <label style={s.label}>Starting Chips</label>
          <input style={s.input} type="number" value={event.starting_chips}
            onChange={e => setEvent({...event, starting_chips:parseInt(e.target.value)})} />

          <label style={s.label}>Chips Per Raffle Ticket</label>
          <input style={s.input} type="number" value={event.chips_per_ticket}
            onChange={e => setEvent({...event, chips_per_ticket:parseInt(e.target.value)})} />

          <label style={s.label}>Gameplay Mode</label>
          <div style={s.modeGrid}>
            {['tight','normal','loose'].map(mode => (
              <div key={mode} 
                style={{...s.modeBtn, ...(event.gameplay_mode===mode ? s.modeBtnActive : {})}}
                onClick={() => setEvent({...event, gameplay_mode:mode})}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </div>
            ))}
          </div>

          <label style={s.label}>Ticket Cap (optional)</label>
          <input style={s.input} type="number" placeholder="No cap" value={event.ticket_cap || ''}
            onChange={e => setEvent({...event, ticket_cap:e.target.value?parseInt(e.target.value):null})} />

          <button style={s.btnPrimary} onClick={saveEvent}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Raffle */}
        <div style={s.card}>
          <div style={s.cardTitle}>Raffle Prizes</div>
          
          <div style={s.ticketStats}>
            <div style={s.ticketNum}>{totalTickets.toLocaleString()}</div>
            <div style={s.ticketLabel}>Total Tickets{event.ticket_cap ? ` / ${event.ticket_cap}` : ''}</div>
          </div>

          {prizes.map(p => (
            <div key={p.id} style={s.prizeRow}>
              <div style={{flex:1}}>
                <div style={s.prizeName}>{p.name}</div>
                {p.drawn_at && <div style={s.prizeWinner}>Winner: {guests.find(g=>g.id===p.winner_guest_id)?.name || '—'}</div>}
              </div>
              {!p.drawn_at ? (
                <>
                  <button style={s.btnDraw} onClick={() => drawWinner(p.id)} disabled={drawing}>
                    {drawing ? 'Drawing...' : 'Draw'}
                  </button>
                  <button style={s.btnDel} onClick={() => removePrize(p.id)}>×</button>
                </>
              ) : (
                <span style={{fontSize:12,color:'rgba(76,175,80,0.8)'}}>✓ Drawn</span>
              )}
            </div>
          ))}

          <div style={{display:'flex',gap:8,marginTop:12}}>
            <input style={{...s.input,flex:1,marginBottom:0}} placeholder="Prize name" value={newPrize}
              onChange={e => setNewPrize(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addPrize()} />
            <button style={s.btnAdd} onClick={addPrize}>+ Add</button>
          </div>

          {drawResult && (
            <div style={s.drumCard}>
              {drawResult.spinning ? (
                <div style={{fontSize:14,color:'rgba(201,168,76,0.7)'}}>Drawing...</div>
              ) : (
                <>
                  <div style={s.winnerLabel}>Winner</div>
                  <div style={s.winnerName}>{drawResult.name}</div>
                  <div style={s.winnerPrize}>{drawResult.prize}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div style={s.card}>
          <div style={s.cardTitle}>Top Players</div>
          {topGuests.map((g, i) => (
            <div key={g.id} style={s.guestRow}>
              <div style={{...s.rank, color: i<3 ? '#c9a84c' : 'rgba(255,255,255,0.3)'}}>
                {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
              </div>
              <div style={s.guestName}>{g.name}</div>
              <div style={s.guestChips}>{Number(g.total_chips).toLocaleString()}</div>
            </div>
          ))}
          {topGuests.length === 0 && <p style={s.muted}>No guests checked in yet.</p>}
        </div>
      </div>
    </div>
  )
}

const s = {
  app:         { minHeight:'100vh', background:'#1a1a1a', fontFamily:"'DM Sans',sans-serif", color:'#fff' },
  header:      { background:'#000', borderBottom:'0.5px solid rgba(201,168,76,0.2)', padding:'24px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  eventName:   { fontSize:18, color:'#fff', marginBottom:4 },
  eventDate:   { fontSize:13, color:'rgba(255,255,255,0.4)' },
  body:        { padding:24, maxWidth:600, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 },
  card:        { background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(201,168,76,0.2)', borderRadius:12, padding:20 },
  cardTitle:   { fontFamily:"'Playfair Display',serif", fontSize:20, color:'#c9a84c', marginBottom:20 },
  label:       { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.6)', marginTop:16, marginBottom:8, display:'block' },
  input:       { width:'100%', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit', marginBottom:12 },
  modeGrid:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 },
  modeBtn:     { padding:'10px', borderRadius:8, fontSize:13, cursor:'pointer', border:'0.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.5)', background:'rgba(255,255,255,0.03)', textAlign:'center', transition:'all 0.2s' },
  modeBtnActive:{ borderColor:'rgba(201,168,76,0.5)', color:'#c9a84c', background:'rgba(201,168,76,0.1)' },
  btnPrimary:  { width:'100%', background:'linear-gradient(135deg,#c9a84c,#a8832a)', border:'none', borderRadius:8, padding:14, fontSize:14, fontWeight:500, color:'#1a0a00', cursor:'pointer', fontFamily:'inherit', marginTop:8 },
  btnAdd:      { background:'rgba(201,168,76,0.1)', border:'0.5px solid rgba(201,168,76,0.35)', borderRadius:8, padding:'11px 18px', fontSize:13, fontWeight:500, color:'#c9a84c', cursor:'pointer', fontFamily:'inherit', flexShrink:0 },
  btnDraw:     { background:'rgba(201,168,76,0.15)', border:'0.5px solid rgba(201,168,76,0.4)', borderRadius:6, padding:'6px 14px', fontSize:12, color:'#c9a84c', cursor:'pointer', fontFamily:'inherit', flexShrink:0 },
  btnDel:      { background:'none', border:'none', color:'rgba(200,60,60,0.6)', cursor:'pointer', fontSize:18, padding:'0 4px', flexShrink:0 },
  ticketStats: { background:'rgba(201,168,76,0.07)', border:'0.5px solid rgba(201,168,76,0.25)', borderRadius:10, padding:18, marginBottom:16, textAlign:'center' },
  ticketNum:   { fontFamily:"'Playfair Display',serif", fontSize:36, color:'#c9a84c' },
  ticketLabel: { fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:4, letterSpacing:1, textTransform:'uppercase' },
  prizeRow:    { display:'flex', alignItems:'center', gap:10, padding:'12px', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:8, marginBottom:8 },
  prizeName:   { fontSize:14, color:'#fff' },
  prizeWinner: { fontSize:12, color:'rgba(76,175,80,0.8)', marginTop:2 },
  drumCard:    { background:'rgba(0,0,0,0.4)', border:'0.5px solid rgba(201,168,76,0.3)', borderRadius:12, padding:28, textAlign:'center', marginTop:16 },
  winnerLabel: { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.6)', marginBottom:8 },
  winnerName:  { fontFamily:"'Playfair Display',serif", fontSize:28, color:'#fff' },
  winnerPrize: { fontSize:14, color:'rgba(255,255,255,0.45)', marginTop:4 },
  guestRow:    { display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)' },
  rank:        { width:28, fontSize:13, flexShrink:0 },
  guestName:   { flex:1, fontSize:14, color:'#fff', paddingLeft:8 },
  guestChips:  { fontSize:14, color:'#c9a84c', fontWeight:500 },
  muted:       { fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:8 },
  loading:     { minHeight:'100vh', background:'#1a1a1a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
}
