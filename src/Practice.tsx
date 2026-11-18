import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowLeft, CheckCheck, Headphones, Lightbulb, Mic, Pause, Play, Send, Square, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountApi, ApiError, errorMessage, levels, type Account, type Preferences } from './account'
import { useAccount } from './AccountPages'

type Level = Preferences['level']
type Turn = { id: string; message: string; reply: string; seconds: number; audio?: string | null; created_at?: string; at?: number; clip?: string; mode?: 'text' | 'voice'; level?: Level | null; has_voice?: boolean }
type Conversation = { id: string; title: string; mode: 'text' | 'voice'; level: Level | null; updated_at: string }
type TurnResult = { turn: Turn; audio: string | null }
const starters = ['Tell me about your weekend.', 'Help me practice for a job interview.', 'How do I use the present perfect?']
const levelNames: Record<Level, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

// Les parties fautives arrivent entre ⟦ ⟧ : on les surligne
function marked(text: string) {
  return text.split(/(⟦[^⟧]*⟧)/u).map((part, index) => part.startsWith('⟦') && part.endsWith('⟧')
    ? <mark key={index} className="wa-err">{part.slice(1, -1)}</mark> : part)
}

function NovaLines({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => {
    const value = line.trim()
    if (!value) return <span key={index} className="wa-gap" aria-hidden="true" />
    if (value.startsWith('🇫🇷')) return <p key={index} lang="fr" className="wa-translation">{value.replace(/^🇫🇷\s*/u, '')}</p>
    if (value.startsWith('👉')) return <p key={index} lang="fr" className="wa-model">{value.replace(/^👉\s*/u, '')}</p>
    if (value.startsWith('🎯')) return <p key={index} lang="fr" className="wa-challenge">{marked(value)}</p>
    if (value.startsWith('🔊')) return <p key={index} lang="en" className="wa-say">{value.replace(/^🔊\s*/u, '')}</p>
    if (/^💡\s*Indice/u.test(value)) return <p key={index} lang="fr" className="wa-clue">{value}</p>
    return <p key={index} lang="en">{marked(value)}</p>
  })}</>
}

function CorrectionLines({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => {
    const value = line.trim()
    if (!value) return null
    if (value.startsWith('📍')) return <p key={index} className="wa-where">{marked(value)}</p>
    if (value.startsWith('✍️')) return <p key={index} className="wa-fixed">{marked(value)}</p>
    if (value.startsWith('✅')) return <p key={index} className="wa-fixed">{marked(value)}</p>
    if (value.startsWith('🎯')) return <p key={index} className="wa-result">{marked(value)}</p>
    return <p key={index}>{marked(value)}</p>
  })}</>
}

function LevelOpener({ level, opener }: { level: Level; opener?: string }) {
  const body = (opener || '').split('\n').slice(1).join('\n').trim()
  const [intro, english] = body.includes('💬') ? [body.slice(0, body.indexOf('💬')), body.slice(body.indexOf('💬')).replace(/^💬\s*Nova\s*:?/u, '')] : ['', body]
  return <div className="wa-turn">
    <p className="wa-chip wa-level-chip">🔄 Nouvelle conversation · Niveau {levelNames[level]}</p>
    {body && <div className="wa-bubble wa-in wa-tail">
      {intro.trim() && <p lang="fr" className="wa-note">{intro.trim()}</p>}
      <div className="wa-answer"><NovaLines text={english.trim()} /></div>
    </div>}
  </div>
}

function stamp(turn: Turn) {
  const value = turn.at ?? (turn.created_at ? Date.parse(turn.created_at) : NaN)
  return Number.isFinite(value) ? value : 0
}

function chronological(list: Turn[]) {
  const unique = new Map<string, Turn>()
  list.forEach(turn => unique.set(turn.id, { ...unique.get(turn.id), ...turn }))
  return [...unique.values()].sort((a, b) => stamp(a) - stamp(b))
}

function dayLabel(turn: Turn) {
  const value = stamp(turn)
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000)
  if (days === 0) return 'Aujourd’hui'
  if (days === 1) return 'Hier'
  const label = date.toLocaleDateString('fr-FR', { weekday: days < 7 ? 'long' : undefined, day: 'numeric', month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function clock(turn: Turn) {
  const date = turn.at ? new Date(turn.at) : turn.created_at ? new Date(turn.created_at) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
}

function duration(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function VoiceNote({ src, seconds = 0, label, autoPlay = false }: { src: string; seconds?: number; label: string; autoPlay?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [length, setLength] = useState(0)
  const total = length || seconds
  const readLength = (element: HTMLAudioElement) => { if (Number.isFinite(element.duration) && element.duration > 0) setLength(element.duration) }
  useEffect(() => { if (autoPlay) audio.current?.play().catch(() => {}) }, [autoPlay])

  function toggle() {
    const element = audio.current
    if (!element) return
    if (element.paused) {
      document.querySelectorAll('audio').forEach(other => { if (other !== element) other.pause() })
      element.play().catch(() => setPlaying(false))
    } else element.pause()
  }

  return <div className="wa-voice">
    <button type="button" className="wa-voice-play" aria-label={playing ? 'Mettre en pause' : label} onClick={toggle}>
      {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
    <input type="range" className="wa-voice-bar" min={0} max={total || 1} step={0.05} value={Math.min(time, total || 1)} aria-label="Position dans le vocal"
      style={{ '--progress': `${total ? Math.min(100, time / total * 100) : 0}%` } as CSSProperties}
      onChange={event => {
        const element = audio.current
        if (!element) return
        element.currentTime = Number(event.target.value)
        setTime(element.currentTime)
      }} />
    <span className="wa-voice-time">{duration(playing || time ? time : total)}</span>
    <audio ref={audio} src={src} preload="metadata"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onEnded={() => { setPlaying(false); setTime(0) }}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
      onLoadedMetadata={event => readLength(event.currentTarget)} onDurationChange={event => readLength(event.currentTarget)} />
  </div>
}

function encodeAudio(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossible de lire cet enregistrement.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.readAsDataURL(blob)
  })
}

export default function Practice() {
  const { account, setAccount } = useAccount()
  const level: Level = account?.preferences?.level ?? 'intermediate'
  const [openers, setOpeners] = useState<Partial<Record<Level, string>>>({})
  const [voicePending, setVoicePending] = useState<string[]>([])
  const [switching, setSwitching] = useState(false)
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(true)
  const [older, setOlder] = useState(false)
  const [audioPending, setAudioPending] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'permission' | 'recording' | 'sending'>('idle')
  const [error, setError] = useState('')
  const [clip, setClip] = useState<{ data: Blob; url: string; seconds: number } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const clipUrls = useRef<string[]>([])
  const conversation = useRef<{ text: string; voice: string }>({ text: '', voice: '' })
  const retry = useRef('')
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const microphoneAttempt = useRef(0)
  const mount = useRef(false)
  const request = useRef<AbortController | null>(null)
  const stopTimer = useRef<number | undefined>(undefined)
  const end = useRef<HTMLDivElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const chain = useRef<Conversation[]>([])
  const cursor = useRef<{ index: number; more: boolean; oldest?: string }>({ index: -1, more: false })
  const keepScroll = useRef<{ height: number; top: number } | null>(null)
  const loadingOlder = useRef(false)
  const [sendingVoice, setSendingVoice] = useState(false)
  const lastTurn = turns.at(-1)?.id

  useEffect(() => {
    mount.current = true
    const historyController = new AbortController()
    accountApi<{ conversations: Conversation[]; openers?: Partial<Record<Level, string>> }>('conversations', undefined, historyController.signal)
      .then(result => {
        chain.current = result.conversations
        setOpeners(result.openers ?? {})
        // On ne reprend que les conversations ouvertes depuis le dernier changement de niveau
        const boundary = Math.max(0, ...result.conversations.filter(entry => entry.level && entry.level !== level).map(entry => Date.parse(entry.updated_at) || 0))
        const current = result.conversations.filter(entry => (entry.level ?? level) === level && (Date.parse(entry.updated_at) || 0) > boundary)
        conversation.current = {
          text: current.find(entry => entry.mode === 'text')?.id || '',
          voice: current.find(entry => entry.mode === 'voice')?.id || '',
        }
        return loadOlder(historyController.signal, 20)
      })
      .catch(reason => { if (!historyController.signal.aborted) setError(errorMessage(reason)) })
      .finally(() => { if (!historyController.signal.aborted) setLoading(false) })
    return () => {
      mount.current = false
      historyController.abort()
      microphoneAttempt.current++
      window.clearTimeout(stopTimer.current)
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach(track => track.stop())
      request.current?.abort()
    }
  }, [])

  useEffect(() => () => { clipUrls.current.forEach(url => URL.revokeObjectURL(url)) }, [])

  function discardClip() {
    if (clip) URL.revokeObjectURL(clip.url)
    setClip(null)
    setError('')
    retry.current = ''
  }

  useEffect(() => {
    if (lastTurn || state === 'sending') end.current?.scrollIntoView({ block: 'nearest' })
  }, [lastTurn, state])

  useLayoutEffect(() => {
    const element = thread.current
    if (!element || !keepScroll.current) return
    element.scrollTop = element.scrollHeight - keepScroll.current.height + keepScroll.current.top
    keepScroll.current = null
  }, [turns])

  useEffect(() => {
    if (state !== 'recording') return
    const started = Date.now()
    setElapsed(0)
    const timer = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 250)
    return () => window.clearInterval(timer)
  }, [state])

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Le micro est indisponible dans ce navigateur. Tu peux écrire ton message.')
      return
    }
    setError('')
    setState('permission')
    const attempt = ++microphoneAttempt.current
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      })
      if (!mount.current || attempt !== microphoneAttempt.current) {
        media.getTracks().forEach(track => track.stop())
        return
      }
      stream.current = media
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('unsupported')
      const active = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 128000 })
      const started = performance.now()
      const chunks: Blob[] = []
      recorder.current = active
      active.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      active.onstop = () => {
        window.clearTimeout(stopTimer.current)
        media.getTracks().forEach(track => track.stop())
        if (!mount.current) return
        const data = new Blob(chunks, { type: active.mimeType || mimeType })
        if (data.size > 0 && data.size <= 3 * 1024 * 1024) {
          retry.current = ''
          const url = URL.createObjectURL(data)
          clipUrls.current.push(url)
          setClip({ data, url, seconds: (performance.now() - started) / 1000 })
        }
        else setError('Cet enregistrement est vide ou trop volumineux. Essaie un vocal plus court.')
        setState('idle')
      }
      active.onerror = () => {
        window.clearTimeout(stopTimer.current)
        active.onstop = null
        media.getTracks().forEach(track => track.stop())
        if (!mount.current) return
        setError('L’enregistrement a été interrompu. Tu peux réessayer ou écrire.')
        setState('idle')
      }
      active.start()
      stopTimer.current = window.setTimeout(() => {
        if (active.state === 'recording') active.stop()
      }, 45000)
      setState('recording')
    } catch (reason) {
      if (!mount.current || attempt !== microphoneAttempt.current) return
      stream.current?.getTracks().forEach(track => track.stop())
      setError(reason instanceof DOMException && reason.name === 'NotAllowedError'
        ? 'Le micro n’a pas été autorisé. Tu peux continuer à l’écrit.'
        : 'Impossible d’utiliser le micro. Tu peux continuer à l’écrit.')
      setState('idle')
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault()
    const text = draft.trim()
    if (state !== 'idle' || loading || (!clip && !text)) return
    const mode = clip ? 'voice' : 'text'
    setError('')
    setSendingVoice(mode === 'voice')
    setState('sending')
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    try {
      const conversationId = conversation.current[mode] ||= crypto.randomUUID()
      const turnId = retry.current ||= crypto.randomUUID()
      const message = clip ? { audio: await encodeAudio(clip.data), mimeType: clip.data.type, seconds: clip.seconds } : { text }
      const result = await accountApi<TurnResult>('turn', { conversationId, turnId, mode, ...message }, controller.signal)
      if (!mount.current) return
      setTurns(previous => chronological([...previous, { ...result.turn, audio: result.audio, at: Date.now(), clip: clip?.url, mode, level }]))
      retry.current = ''
      if (clip) setClip(null)
      else setDraft('')
    } catch (reason) {
      if (mount.current) {
        // Le niveau a changé ailleurs (réglages, autre appareil) : la prochaine phrase ouvrira une nouvelle conversation
        if (reason instanceof ApiError && reason.status === 409 && /niveau/i.test(reason.message)) conversation.current = { text: '', voice: '' }
        setError(errorMessage(reason))
      }
    } finally {
      window.clearTimeout(timeout)
      if (mount.current) setState('idle')
    }
  }

  async function loadOlder(signal?: AbortSignal, minimum = 1) {
    if (loadingOlder.current) return
    loadingOlder.current = true
    try {
      let { index, more, oldest } = cursor.current
      const gathered: Turn[] = []
      while (gathered.length < minimum) {
        if (index < 0 || !more) {
          index += 1
          oldest = undefined
          if (index >= chain.current.length) { index = chain.current.length; more = false; break }
        }
        const entry = chain.current[index]
        const query = `turns?conversation=${encodeURIComponent(entry.id)}${oldest ? `&before=${encodeURIComponent(oldest)}` : ''}`
        const result = await accountApi<{ turns: Turn[]; more: boolean }>(query, undefined, signal)
        gathered.push(...result.turns.map(turn => ({ ...turn, mode: entry.mode, level: entry.level ?? level })))
        more = result.more && result.turns.length > 0
        oldest = result.turns[0]?.id ?? oldest
      }
      if (signal?.aborted || !mount.current) return
      cursor.current = { index, more, oldest }
      setOlder(more || index < chain.current.length - 1)
      if (gathered.length) setTurns(previous => chronological([...gathered, ...previous]))
    } finally { loadingOlder.current = false }
  }

  async function showOlder() {
    if (!older || loading || loadingOlder.current) return
    const element = thread.current
    setLoading(true)
    setError('')
    try {
      if (element) keepScroll.current = { height: element.scrollHeight, top: element.scrollTop }
      await loadOlder(undefined, 15)
    } catch (reason) {
      keepScroll.current = null
      setError(errorMessage(reason))
    } finally { setLoading(false) }
  }

  async function play(turnId: string) {
    setAudioPending(previous => [...previous, turnId])
    setError('')
    try {
      const { audio } = await accountApi<{ audio: string }>('audio', { turnId })
      setTurns(previous => previous.map(turn => turn.id === turnId ? { ...turn, audio } : turn))
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setAudioPending(previous => previous.filter(id => id !== turnId)) }
  }

  async function listenOwn(turnId: string) {
    setVoicePending(previous => [...previous, turnId])
    setError('')
    try {
      const { audio, type } = await accountApi<{ audio: string; type: string }>(`voice?turn=${encodeURIComponent(turnId)}`)
      setTurns(previous => previous.map(turn => turn.id === turnId ? { ...turn, clip: `data:${type || 'audio/webm'};base64,${audio}`, autoPlay: true } as Turn : turn))
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setVoicePending(previous => previous.filter(id => id !== turnId)) }
  }

  // Changer de niveau ouvre une nouvelle conversation, annoncée par Nova
  async function changeLevel(next: Level) {
    if (!account?.preferences || next === level || switching) return
    setSwitching(true)
    setError('')
    try {
      const result = await accountApi<{ account: Account }>('preferences', { ...account.preferences, level: next })
      conversation.current = { text: '', voice: '' }
      retry.current = ''
      setAccount(result.account)
      window.setTimeout(() => end.current?.scrollIntoView({ block: 'nearest' }), 50)
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setSwitching(false) }
  }

  const status = state === 'sending' ? (sendingVoice ? 'écoute ton vocal…' : 'écrit…') : state === 'recording' ? 't’écoute…' : 'en ligne'
  const busy = state !== 'idle' || loading
  const typing = !!draft.trim()

  return <section className="practice">
    <header className="practice-header">
      <h1 lang="en">AI Tutor</h1>
      <p>Écris ou envoie un vocal en anglais, et reçois des corrections expliquées en français.</p>
    </header>
    <section className="wa-chat" aria-label="Conversation avec Nova">
      <div className="wa-bar">
        <Link className="wa-icon wa-back-mobile" to="/app/dashboard" aria-label="Retour au menu"><ArrowLeft size={20} /></Link>
        <img className="wa-avatar" src="/mate.svg" alt="" width="40" height="40" />
        <div className="wa-contact">
          <strong>Nova</strong>
          <small className={state !== 'idle' ? 'wa-live' : ''} aria-live="polite">{status}</small>
        </div>
        {account?.preferences && <label className="wa-level">
          <span className="sr-only">Ton niveau</span>
          <select value={level} disabled={busy || switching} onChange={event => changeLevel(event.target.value as Level)} aria-label="Changer de niveau">
            {levels.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>}
      </div>
      <div className="wa-thread" role="log" aria-label="Messages" ref={thread}
        onScroll={event => { if (event.currentTarget.scrollTop < 60 && older && !loading) showOlder() }}>
        {older && !loading && <button className="wa-chip wa-chip-button" type="button" onClick={showOlder}>Afficher les messages précédents</button>}
        {loading && <p className="wa-chip" role="status">Chargement de la conversation…</p>}
        {!older && !loading && <p className="wa-chip wa-chip-info">🔒 Tes messages servent uniquement à ta pratique avec Nova.</p>}

        {turns.map((turn, position) => {
          const day = dayLabel(turn)
          const newDay = day && day !== dayLabel(turns[position - 1] ?? {} as Turn)
          const spoken = turn.mode === 'voice'
          const separator = turn.reply.match(/💬\s*(?:Nova)?\s*[:\n\-–]?/i)
          const corrections = separator?.index === undefined ? '' : turn.reply.slice(0, separator.index).replace(/^💡\s*Corrections(?:\s*&\s*Conseils)?\s*:\s*/i, '').trim()
          const answer = separator?.index === undefined ? turn.reply : turn.reply.slice(separator.index + separator[0].length).trim()
          const time = clock(turn)
          const previous = turns[position - 1]
          const levelChanged = !!previous && !!turn.level && !!previous.level && turn.level !== previous.level
          return <div className="wa-turn" key={turn.id}>
            {newDay && <p className="wa-chip wa-day">{day}</p>}
            {levelChanged && turn.level && <LevelOpener level={turn.level} opener={openers[turn.level]} />}
            <div className="wa-bubble wa-out wa-tail">
              {spoken && (turn.clip
                ? <VoiceNote src={turn.clip} seconds={turn.seconds} label="Réécouter ton vocal" autoPlay={(turn as Turn & { autoPlay?: boolean }).autoPlay} />
                : <span className="wa-voice-label"><Mic size={14} aria-hidden="true" /> Message vocal{turn.seconds ? ` · ${duration(turn.seconds)}` : ''}
                  {turn.has_voice && <button type="button" className="wa-own-play" disabled={voicePending.includes(turn.id)} onClick={() => listenOwn(turn.id)}>
                    <Play size={13} fill="currentColor" aria-hidden="true" />{voicePending.includes(turn.id) ? 'Chargement…' : 'Réécouter'}</button>}</span>)}
              {spoken ? <p className="wa-transcript"><small>Transcription</small>{turn.message}</p> : <p>{turn.message}</p>}
              <span className="wa-meta">{time}<CheckCheck size={16} className="wa-read" aria-label="Lu" /></span>
            </div>
            <div className="wa-bubble wa-in wa-tail">
              {corrections && <div className="wa-quote"><strong><Lightbulb size={14} aria-hidden="true" /> Corrections</strong><CorrectionLines text={corrections} /></div>}
              <div className="wa-answer"><NovaLines text={answer} /></div>
              {turn.audio ? <VoiceNote src={`data:audio/mpeg;base64,${turn.audio}`} label="Écouter la réponse de Nova" /> :
                <button className="wa-listen" type="button" disabled={audioPending.includes(turn.id)} onClick={() => play(turn.id)}>
                  <Headphones size={15} aria-hidden="true" />{audioPending.includes(turn.id) ? 'Préparation…' : 'Écouter'}</button>}
              <span className="wa-meta">{time}</span>
            </div>
          </div>
        })}
        {!loading && (turns.at(-1)?.level ?? null) !== level && (turns.length
          ? <LevelOpener level={level} opener={openers[level]} />
          : <div className="wa-bubble wa-in wa-tail"><p lang="en">Hi, I’m Nova! 👋 What would you like to talk about today?</p>
            <p lang="fr" className="wa-note">Niveau {levelNames[level]} · tu peux le changer en haut à droite.</p></div>)}
        {state === 'sending' && <div className="wa-bubble wa-in wa-tail wa-typing" role="status" aria-label={sendingVoice ? 'Nova écoute ton vocal' : 'Nova écrit'}>
          <span /><span /><span /></div>}
        <div ref={end} />
      </div>
      <form className="wa-composer" onSubmit={send}>
        {!turns.length && !draft && !clip && state === 'idle' && <div className="wa-suggestions">
          {starters.map(text => <button type="button" disabled={busy} key={text} onClick={() => setDraft(text)}>{text}</button>)}
        </div>}
        {state === 'permission' && <p className="wa-hint" role="status">En attente de l’autorisation du micro… <button type="button" onClick={() => {
          microphoneAttempt.current++
          setState('idle')
        }}>Annuler</button></p>}
        {error && <p className="practice-error wa-hint" role="alert">{error}</p>}
        <div className="wa-input-row">
          <div className={`wa-field ${clip ? 'wa-field-clip' : ''}`}>
            {clip ? <div className="wa-preview">
              <button className="wa-icon wa-trash" type="button" aria-label="Supprimer le vocal" disabled={state !== 'idle'} onClick={discardClip}><Trash2 size={19} /></button>
              <VoiceNote src={clip.url} seconds={clip.seconds} label="Réécouter ton vocal avant de l’envoyer" />
            </div> : state === 'recording' ? <p className="wa-recording" role="status"><span className="wa-dot" /> {duration(elapsed)} <small>· max 0:45</small></p>
              : <textarea id="practice-message" aria-label="Ton message" value={draft} disabled={busy} placeholder="Write something in English…" rows={1} maxLength={1500}
                onChange={event => { retry.current = ''; setDraft(event.target.value) }}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() }
                }} />}
          </div>
          {state === 'recording'
            ? <button className="wa-send wa-stop" type="button" aria-label="Arrêter l’enregistrement" onClick={() => recorder.current?.stop()}><Square size={18} fill="currentColor" /></button>
            : clip || typing
              ? <button className="wa-send" type="submit" aria-label="Envoyer" disabled={busy}><Send size={20} /></button>
              : <button className="wa-send" type="button" aria-label="Enregistrer un vocal" disabled={busy} onClick={startRecording}><Mic size={22} /></button>}
        </div>
      </form>
    </section>
  </section>
}
