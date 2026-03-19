// src/pages/CheckIn.jsx
// Guest-facing page — reached by scanning the event QR code
// URL: checkin.stlcasinoparty.com/event/:eventId

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Screens ──────────────────────────────────────────────
const SCREEN = {
  LOADING:  'loading',
  FORM:     'form',
  WALLET:   'wallet',
  DEALER:   'dealer',
  BUYIN:    'buyin',
  TALLY:    'tally',
  DONE:     'done',
  ERROR:    'error',
}

const BUYIN_PACKAGES = [
  { chips: 1000, price: 10 },
  { chips: 2500, price: 20 },
  { chips: 5000, price: 35 },
]

export default function CheckIn() {
  const { eventId } = useParams()
  const [screen, setScreen]   = useState(SCREEN.LOADING)
  const [event, setEvent]     = useState(null)
  const [guest, setGuest]     = useState(null)  // saved DB row
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [selected, setSelected] = useState(null)
  const [tallyVal, setTallyVal] = useState('')
  const [paying, setPaying]   = useState(false)

  // ── Load event config on mount ─────────────────────────
  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setScreen(SCREEN.ERROR)
        return
      }
      setEvent(data)
      setScreen(SCREEN.FORM)
    }
    loadEvent()
  }, [eventId])

  // ── Real-time: watch guest row for dealer confirmation ─
  useEffect(() => {
    if (!guest) return
    const channel = supabase
      .channel('guest-' + guest.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'guests',
        filter: `id=eq.${guest.id}`,
      }, (payload) => {
        setGuest(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [guest?.id])

  // ── Check in ───────────────────────────────────────────
  async function handleCheckIn() {
    setError('')
    if (!name.trim() || !phone.trim()) {
      setError('Please enter your name and phone number.')
      return
    }
    const { data, error: err } = await supabase
      .from('guests')
      .insert({
        event_id:       eventId,
        name:           name.trim(),
        phone:          phone.trim(),
        starting_chips: event.starting_chips,
      })
      .select()
      .single()

    if (err) { setError('Something went wrong. Please try again.'); return }
    setGuest(data)
    setScreen(SCREEN.WALLET)
  }

  // ── Dealer confirms buy-in ─────────────────────────────
  async function handleDealerConfirm() {
    const { data, error: err } = await supabase
      .from('guests')
      .update({ dealer_confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', guest.id)
      .select()
      .single()

    if (!err) { setGuest(data); setScreen(SCREEN.WALLET) }
  }

  // ── Buy more chips (Square placeholder) ───────────────
  async function handleBuyin() {
    if (!selected) return
    setPaying(true)

    // TODO: Replace this block with real Square Web Payments SDK call.
    // Square will return a payment token; send it to a Supabase Edge Function
    // that calls Square's server API to charge the card, then inserts the buyin row.
    await new Promise(r => setTimeout(r, 1200)) // simulate payment delay

    // Record the buy-in
    const { error: err } = await supabase.from('buyins').insert({
      guest_id:         guest.id,
      event_id:         eventId,
      chips:            selected.chips,
      amount_cents:     selected.price * 100,
      square_payment_id: 'PLACEHOLDER_' + Date.now(),
    })

    if (!err) {
      // Update guest's extra_chips total
      const newExtra = (guest.extra_chips || 0) + selected.chips
      const { data } = await supabase
        .from('guests')
        .update({ extra_chips: newExtra })
        .eq('id', guest.id)
        .select()
        .single()
      setGuest(data)
    }

    setSelected(null)
    setPaying(false)
    setScreen(SCREEN.WALLET)
  }

  // ── End of night tally ─────────────────────────────────
  async function handleTally() {
    const chips = parseInt(tallyVal)
    if (isNaN(chips) || chips < 0) return
    const { data } = await supabase
      .from('guests')
      .update({ final_chips: chips, tally_submitted: true })
      .eq('id', guest.id)
      .select()
      .single()
    setGuest(data)
    setScreen(SCREEN.DONE)
  }

  // ── Derived values ─────────────────────────────────────
  const totalChips   = guest ? (guest.starting_chips + (guest.extra_chips || 0)) : 0
  const finalChips   = parseInt(tallyVal) || 0
  const ticketCount  = event ? Math.ceil(finalChips / event.chips_per_ticket) : 0

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <img src="/logo.png" alt="St. Louis Casino Party" style={{height:52,width:'auto'}} />
        <div style={styles.eventLabel}>{event?.name ?? '...'}</div>
      </div>

      {/* ── Loading ── */}
      {screen === SCREEN.LOADING && (
        <div style={styles.center}><p style={styles.muted}>Loading event...</p></div>
      )}

      {/* ── Error ── */}
      {screen === SCREEN.ERROR && (
        <div style={styles.center}>
          <p style={styles.muted}>This event link is no longer active.</p>
        </div>
      )}

      {/* ── Check-in Form ── */}
      {screen === SCREEN.FORM && (
        <div style={styles.body}>
          <h1 style={styles.h1}>Welcome!<br/>Let's get you checked in.</h1>
          <p style={styles.sub}>Enter your info to receive your starting chips. No account needed.</p>

          <label style={styles.fieldLabel}>Your name</label>
          <input style={styles.input} value={name} onChange={e => setName(e.target.value)}
            placeholder="First & last name" type="text" autoComplete="off" />

          <label style={styles.fieldLabel}>Mobile number</label>
          <input style={styles.input} value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="(314) 555-0000" type="tel" autoComplete="off" />

          {error && <p style={styles.errorText}>{error}</p>}

          <button style={styles.btnPrimary} onClick={handleCheckIn}>
            Get My Chips →
          </button>
          <p style={styles.privacy}>Your info is used for this event only and not stored long-term.</p>
        </div>
      )}

      {/* ── Chip Wallet ── */}
      {screen === SCREEN.WALLET && guest && (
        <div style={styles.body}>
          <div style={styles.playerName}>{guest.name}</div>
          <div style={styles.playerId}>Player #{guest.id.slice(-4).toUpperCase()}</div>

          <div style={styles.chipCard}>
            <div style={styles.chipLabel}>Current chip balance</div>
            <div style={styles.chipAmount}>{totalChips.toLocaleString()}</div>
            <div style={styles.chipUnit}>chips</div>
            <div style={styles.statusRow}>
              <div style={{...styles.statusDot, background: guest.dealer_confirmed ? '#4caf50' : '#f0a500'}} />
              <span style={styles.statusText}>
                {guest.dealer_confirmed ? 'Confirmed by dealer' : 'Awaiting dealer confirmation'}
              </span>
            </div>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoKey}>Starting chips</span>
            <span style={styles.infoVal}>{guest.starting_chips.toLocaleString()}</span>
          </div>
          {guest.extra_chips > 0 && (
            <div style={styles.infoRow}>
              <span style={styles.infoKey}>Additional buy-ins</span>
              <span style={{...styles.infoVal, color:'#c9a84c'}}>+{guest.extra_chips.toLocaleString()}</span>
            </div>
          )}
          <div style={styles.infoRow}>
            <span style={styles.infoKey}>Event</span>
            <span style={styles.infoVal}>{event.name}</span>
          </div>

          <div style={styles.actionArea}>
            {event.is_fundraiser && (
              <button style={styles.btnSecondary} onClick={() => setScreen(SCREEN.BUYIN)}>
                + Buy More Chips
              </button>
            )}
            <button style={styles.btnGhost} onClick={() => setScreen(SCREEN.DEALER)}>
              Dealer confirmation view →
            </button>
            <button style={styles.btnGhost} onClick={() => setScreen(SCREEN.TALLY)}>
              End of night tally →
            </button>
          </div>
        </div>
      )}

      {/* ── Dealer Confirm ── */}
      {screen === SCREEN.DEALER && guest && (
        <div style={styles.body}>
          <div style={styles.dealerBadge}>Dealer view</div>
          <p style={styles.sub}>Confirm this guest has received their chips.</p>
          <div style={styles.confirmCard}>
            <div style={styles.playerName}>{guest.name}</div>
            <div style={styles.playerId}>{guest.phone}</div>
            <div style={styles.confirmChips}>
              <span style={styles.chipAmount}>{totalChips.toLocaleString()}</span>
              <span style={styles.chipUnit}> chips</span>
            </div>
          </div>
          <button style={styles.btnPrimary} onClick={handleDealerConfirm}>
            Confirm Buy-In / Chips Issued
          </button>
          <p style={{...styles.privacy, textAlign:'center', marginTop:12}}>
            This logs the transaction and confirms the guest's wallet.
          </p>
          <button style={styles.btnGhost} onClick={() => setScreen(SCREEN.WALLET)}>← Back</button>
        </div>
      )}

      {/* ── Buy More Chips ── */}
      {screen === SCREEN.BUYIN && (
        <div style={styles.body}>
          <h2 style={styles.h2}>Buy More Chips</h2>
          <p style={styles.sub}>Payment processed securely via Square.</p>
          {BUYIN_PACKAGES.map(pkg => (
            <div key={pkg.chips}
              onClick={() => setSelected(pkg)}
              style={{...styles.buyinOption, ...(selected?.chips === pkg.chips ? styles.buyinSelected : {})}}>
              <span style={styles.buyinChips}>{pkg.chips.toLocaleString()} chips</span>
              <span style={styles.buyinPrice}>${pkg.price}</span>
            </div>
          ))}
          <button
            style={{...styles.btnPrimary, opacity: selected ? 1 : 0.4, marginTop:20}}
            disabled={!selected || paying}
            onClick={handleBuyin}>
            {paying ? 'Processing...' : selected ? `Pay $${selected.price} via Square →` : 'Select a package'}
          </button>
          <button style={styles.btnGhost} onClick={() => setScreen(SCREEN.WALLET)}>← Cancel</button>
        </div>
      )}

      {/* ── End of Night Tally ── */}
      {screen === SCREEN.TALLY && (
        <div style={styles.body}>
          <h2 style={styles.h2}>End of Night</h2>
          <p style={styles.sub}>Dealer enters this guest's final chip count.</p>
          <label style={styles.fieldLabel}>Final chip count</label>
          <input style={styles.input} type="number" placeholder="e.g. 12500"
            value={tallyVal} onChange={e => setTallyVal(e.target.value)} />
          {tallyVal && !isNaN(parseInt(tallyVal)) && (
            <div style={styles.tallyCard}>
              <div style={styles.chipLabel}>Total chips</div>
              <div style={styles.chipAmount}>{parseInt(tallyVal).toLocaleString()}</div>
              {event.raffle_enabled && (
                <div style={styles.ticketLine}>
                  Converts to <strong>{ticketCount.toLocaleString()}</strong> raffle tickets
                  <br/><span style={{fontSize:11,opacity:0.5}}>(1 ticket per {event.chips_per_ticket} chips, rounded up)</span>
                </div>
              )}
            </div>
          )}
          <button
            style={{...styles.btnPrimary, opacity: tallyVal ? 1 : 0.4}}
            disabled={!tallyVal}
            onClick={handleTally}>
            Submit Final Count
          </button>
          <button style={styles.btnGhost} onClick={() => setScreen(SCREEN.WALLET)}>← Back</button>
        </div>
      )}

      {/* ── Done ── */}
      {screen === SCREEN.DONE && (
        <div style={{...styles.body, alignItems:'center', textAlign:'center', justifyContent:'center'}}>
          <div style={{fontSize:60, marginBottom:16}}>🎲</div>
          <h2 style={styles.h2}>All set!</h2>
          <p style={styles.sub}>Your final count has been submitted. Thanks for playing — good luck in the raffle!</p>
          {guest?.final_chips && (
            <div style={styles.tallyCard}>
              <div style={styles.chipLabel}>Final chips</div>
              <div style={styles.chipAmount}>{guest.final_chips.toLocaleString()}</div>
              <div style={styles.ticketLine}>
                = {Math.ceil(guest.final_chips / event.chips_per_ticket)} raffle tickets
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────
const styles = {
  app:         { minHeight:'100vh', background:'#0d1a0d', display:'flex', flexDirection:'column', fontFamily:"'DM Sans', sans-serif" },
  header:      { padding:'24px 24px 14px', borderBottom:'0.5px solid rgba(201,168,76,0.2)', background:'#0a130a' },
  logo:        { fontFamily:"'Playfair Display', serif", fontSize:20, color:'#c9a84c' },
  eventLabel:  { fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:2, letterSpacing:1 },
  body:        { flex:1, padding:'28px 24px', display:'flex', flexDirection:'column', gap:0 },
  center:      { flex:1, display:'flex', alignItems:'center', justifyContent:'center' },
  h1:          { fontFamily:"'Playfair Display', serif", fontSize:26, color:'#fff', lineHeight:1.3, marginBottom:8 },
  h2:          { fontFamily:"'Playfair Display', serif", fontSize:22, color:'#fff', marginBottom:8 },
  sub:         { fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:24, lineHeight:1.5 },
  muted:       { color:'rgba(255,255,255,0.4)', fontSize:14 },
  fieldLabel:  { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'#c9a84c', marginBottom:8, display:'block', marginTop:12 },
  input:       { width:'100%', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(201,168,76,0.3)', borderRadius:10, padding:'14px 16px', fontSize:16, color:'#fff', outline:'none', fontFamily:'inherit', marginBottom:4 },
  errorText:   { fontSize:13, color:'#f07070', marginBottom:8 },
  btnPrimary:  { width:'100%', background:'linear-gradient(135deg,#c9a84c,#a8832a)', border:'none', borderRadius:10, padding:16, fontSize:16, fontWeight:500, color:'#1a0a00', cursor:'pointer', marginTop:12, fontFamily:'inherit' },
  btnSecondary:{ width:'100%', background:'rgba(201,168,76,0.12)', border:'0.5px solid rgba(201,168,76,0.4)', borderRadius:10, padding:14, fontSize:15, fontWeight:500, color:'#c9a84c', cursor:'pointer', fontFamily:'inherit' },
  btnGhost:    { background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:13, cursor:'pointer', padding:'10px 0', textAlign:'center', fontFamily:'inherit' },
  privacy:     { fontSize:12, color:'rgba(255,255,255,0.25)', textAlign:'center', marginTop:12, lineHeight:1.5 },
  playerName:  { fontFamily:"'Playfair Display', serif", fontSize:28, color:'#fff', marginBottom:4 },
  playerId:    { fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:24, letterSpacing:1 },
  chipCard:    { background:'linear-gradient(135deg,#1c3a1c,#0f2a0f)', border:'0.5px solid rgba(201,168,76,0.35)', borderRadius:16, padding:24, marginBottom:20 },
  chipLabel:   { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.7)', marginBottom:12 },
  chipAmount:  { fontFamily:"'Playfair Display', serif", fontSize:52, color:'#c9a84c', lineHeight:1 },
  chipUnit:    { fontSize:16, color:'rgba(201,168,76,0.6)', marginTop:6 },
  statusRow:   { display:'flex', alignItems:'center', gap:8, marginTop:16 },
  statusDot:   { width:8, height:8, borderRadius:'50%' },
  statusText:  { fontSize:12, color:'rgba(255,255,255,0.55)' },
  infoRow:     { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:'0.5px solid rgba(255,255,255,0.07)' },
  infoKey:     { fontSize:13, color:'rgba(255,255,255,0.45)' },
  infoVal:     { fontSize:14, color:'#fff', fontWeight:500 },
  actionArea:  { marginTop:'auto', display:'flex', flexDirection:'column', gap:12, paddingTop:20 },
  dealerBadge: { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'rgba(201,168,76,0.6)', marginBottom:8 },
  confirmCard: { background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(201,168,76,0.25)', borderRadius:16, padding:24, marginBottom:24 },
  confirmChips:{ display:'flex', alignItems:'baseline', gap:8, marginTop:16 },
  buyinOption: { background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(201,168,76,0.2)', borderRadius:12, padding:'18px 20px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' },
  buyinSelected:{ borderColor:'#c9a84c', background:'rgba(201,168,76,0.1)' },
  buyinChips:  { fontSize:16, fontWeight:500, color:'#fff' },
  buyinPrice:  { fontSize:15, color:'#c9a84c' },
  tallyCard:   { background:'rgba(201,168,76,0.08)', border:'0.5px solid rgba(201,168,76,0.3)', borderRadius:16, padding:24, marginBottom:20, textAlign:'center' },
  ticketLine:  { fontSize:14, color:'rgba(255,255,255,0.45)', marginTop:12, lineHeight:1.6 },
}
