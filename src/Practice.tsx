import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Mic, RotateCcw, Send, Square } from 'lucide-react'
import { Link } from 'react-router-dom'

const levels = [['beginner', 'Débutant'], ['intermediate', 'Intermédiaire'], ['advanced', 'Avancé']]
const endpoint = '/api/practice'
type Turn = { input: string; reply: string; audio: string | null; voice: boolean }

function encodeAudio(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossible de lire cet enregistrement.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.readAsDataURL(blob)
  })
}

export default function Practice() {
  const [level, setLevel] = useState('intermediate')
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [state, setState] = useState<'idle' | 'permission' | 'recording' | 'sending'>('idle')
  const [error, setError] = useState('')
  const [clip, setClip] = useState<{ data: Blob; url: string } | null>(null)
  const session = useRef('')
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const microphoneAttempt = useRef(0)
  const mount = useRef(false)
  const request = useRef<AbortController | null>(null)
  const stopTimer = useRef<number | undefined>(undefined)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mount.current = true
    return () => {
      mount.current = false
      microphoneAttempt.current++
      window.clearTimeout(stopTimer.current)
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach(track => track.stop())
      request.current?.abort()
    }
  }, [])

  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url)
  }, [clip])

  useEffect(() => {
    if (turns.length) end.current?.scrollIntoView({ block: 'nearest' })
  }, [turns])

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Le micro est indisponible dans ce navigateur. Tu peux écrire ton message.')
      return
    }
    setError('')
    setState('permission')
    const attempt = ++microphoneAttempt.current
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mount.current || attempt !== microphoneAttempt.current) {
        media.getTracks().forEach(track => track.stop())
        return
      }
      stream.current = media
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('unsupported')
      const active = new MediaRecorder(media, { mimeType })
      const chunks: Blob[] = []
      recorder.current = active
      active.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      active.onstop = () => {
        window.clearTimeout(stopTimer.current)
        media.getTracks().forEach(track => track.stop())
        if (!mount.current) return
        const data = new Blob(chunks, { type: active.mimeType || mimeType })
        if (data.size > 0 && data.size <= 3 * 1024 * 1024) setClip({ data, url: URL.createObjectURL(data) })
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
    if (state !== 'idle' || (!text && !clip)) return
    setError('')
    setState('sending')
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    try {
      session.current ||= crypto.randomUUID()
      const message = clip ? { audio: await encodeAudio(clip.data), mimeType: clip.data.type } : { text }
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ sessionId: session.current, level, ...message }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Le coach est temporairement indisponible.')
      if (typeof result?.fullText !== 'string' || !result.fullText.trim()) throw new Error('Le coach a renvoyé une réponse vide. Réessaie.')
      setTurns(previous => [...previous, {
        input: clip ? result.transcript : text,
        reply: result.fullText,
        audio: result.audio ? `data:audio/mpeg;base64,${result.audio}` : null,
        voice: Boolean(clip),
      }])
      if (clip) setClip(null)
      else setDraft('')
    } catch (reason) {
      if (mount.current) {
        setError(controller.signal.aborted || reason instanceof TypeError
          ? 'La connexion a été interrompue ou a pris trop de temps. Réessaie.'
          : reason instanceof Error ? reason.message : 'Le message n’a pas été envoyé. Réessaie.')
      }
    } finally {
      window.clearTimeout(timeout)
      if (mount.current) setState('idle')
    }
  }

  return <main id="main" className="wrap practice">
    <Link className="text-link" to="/"><ArrowLeft size={17} aria-hidden="true" /> Retour à l’accueil</Link>
    <header className="practice-header">
      <h1>Pratique ton anglais.</h1>
      <p>Écris ou enregistre un vocal pour recevoir une réponse de Nova et des corrections en français.</p>
    </header>
    <section className="practice-chat" aria-label="Conversation avec Nova">
      <div className="practice-toolbar">
        <label>Niveau <select value={level} disabled={state === 'sending'} onChange={event => setLevel(event.target.value)}>
          {levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <button type="button" className="text-link" disabled={state !== 'idle'} onClick={() => {
          session.current = ''
          setTurns([])
          setDraft('')
          setClip(null)
          setError('')
        }}><RotateCcw size={16} aria-hidden="true" /> Nouvelle conversation</button>
      </div>
      <div className="practice-thread" role="log" aria-label="Messages">
        {!turns.length && <p className="practice-welcome" lang="en">Hi, I’m Nova! What would you like to talk about today?</p>}
        {turns.map((turn, index) => <div className="practice-turn" key={index}>
          <div className="practice-user"><strong>{turn.voice ? 'Ton vocal · Transcription' : 'Toi'}</strong><p>{turn.input}</p></div>
          <div className="practice-reply"><strong>Nova</strong><p>{turn.reply}</p>
            {turn.audio && <audio controls preload="none" src={turn.audio} aria-label="Réponse audio en anglais" />}
            {turn.voice && !turn.audio && <small>La réponse audio est temporairement indisponible.</small>}
          </div>
        </div>)}
        {state === 'sending' && <p role="status">Nova prépare ta réponse…</p>}
        <div ref={end} />
      </div>
      <form className="practice-form" onSubmit={send}>
        {clip ? <div className="practice-preview">
          <audio controls src={clip.url} aria-label="Réécouter ton enregistrement" />
          <button className="text-link" type="button" disabled={state !== 'idle'} onClick={() => { setClip(null); setError('') }}>Annuler le vocal</button>
        </div> : <label htmlFor="practice-message">Ton message<textarea id="practice-message" value={draft}
          disabled={state !== 'idle'} placeholder="Write something in English…" rows={3} maxLength={1500} onChange={event => setDraft(event.target.value)} /></label>}
        <div className="practice-actions">
          {!clip && (state === 'recording'
            ? <button className="button practice-secondary" type="button" onClick={() => recorder.current?.stop()}><Square size={16} /> Arrêter</button>
            : <button className="button practice-secondary" type="button" disabled={state !== 'idle'} onClick={startRecording}><Mic size={17} /> Enregistrer un vocal</button>)}
          <button className="button" type="submit" disabled={state !== 'idle' || (!draft.trim() && !clip)}><Send size={17} /> Envoyer</button>
        </div>
        {state === 'recording' && <p role="status">Enregistrement en cours. Durée maximale de 45 secondes.</p>}
        {state === 'permission' && <div>
          <p role="status">En attente de l’autorisation du micro.</p>
          <button type="button" className="text-link" onClick={() => {
            microphoneAttempt.current++
            setState('idle')
          }}>Continuer à l’écrit</button>
        </div>}
        {error && <p className="practice-error" role="alert">{error}</p>}
      </form>
    </section>
  </main>
}
