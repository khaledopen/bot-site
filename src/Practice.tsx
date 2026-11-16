import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AudioLines, Headphones, Mic, RotateCcw, Send, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountApi, errorMessage } from './account'

type Turn = { id: string; message: string; reply: string; seconds: number; audio?: string | null }
type Conversation = { id: string; title: string; mode: 'text' | 'voice'; updated_at: string }
type TurnResult = { turn: Turn; audio: string | null }
const starters = ['Tell me about your weekend.', 'Help me practice for a job interview.', 'How do I use the present perfect?']

function encodeAudio(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossible de lire cet enregistrement.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.readAsDataURL(blob)
  })
}

export default function Practice({ voice = false }: { voice?: boolean }) {
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [more, setMore] = useState(false)
  const [audioPending, setAudioPending] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'permission' | 'recording' | 'sending'>('idle')
  const [error, setError] = useState('')
  const [clip, setClip] = useState<{ data: Blob; url: string; seconds: number } | null>(null)
  const conversation = useRef('')
  const retry = useRef('')
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const microphoneAttempt = useRef(0)
  const mount = useRef(false)
  const request = useRef<AbortController | null>(null)
  const stopTimer = useRef<number | undefined>(undefined)
  const end = useRef<HTMLDivElement>(null)
  const mode = voice ? 'voice' : 'text'
  const lastTurn = turns.at(-1)?.id

  useEffect(() => {
    mount.current = true
    const historyController = new AbortController()
    accountApi<{ conversations: Conversation[] }>('conversations', undefined, historyController.signal)
      .then(result => setConversations(result.conversations.filter(entry => entry.mode === mode)))
      .catch(reason => { if (!historyController.signal.aborted) setError(errorMessage(reason)) })
    return () => {
      mount.current = false
      historyController.abort()
      microphoneAttempt.current++
      window.clearTimeout(stopTimer.current)
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach(track => track.stop())
      request.current?.abort()
    }
  }, [mode])

  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url)
  }, [clip])

  useEffect(() => {
    if (lastTurn) end.current?.scrollIntoView({ block: 'nearest' })
  }, [lastTurn])

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
          setClip({ data, url: URL.createObjectURL(data), seconds: (performance.now() - started) / 1000 })
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
    if (state !== 'idle' || loading || (voice ? !clip : !text)) return
    setError('')
    setState('sending')
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    try {
      const conversationId = conversation.current ||= crypto.randomUUID()
      const turnId = retry.current ||= crypto.randomUUID()
      const message = clip ? { audio: await encodeAudio(clip.data), mimeType: clip.data.type, seconds: clip.seconds } : { text }
      const result = await accountApi<TurnResult>('turn', { conversationId, turnId, mode, ...message }, controller.signal)
      if (!mount.current) return
      setTurns(previous => [...previous.filter(turn => turn.id !== result.turn.id), { ...result.turn, audio: result.audio }])
      setConversations(previous => {
        const item = previous.find(entry => entry.id === conversationId)
        return [{ id: conversationId, title: item?.title || result.turn.message.slice(0, 72), mode, updated_at: new Date().toISOString() },
          ...previous.filter(entry => entry.id !== conversationId)]
      })
      setSelected(conversationId)
      retry.current = ''
      if (clip) setClip(null)
      else setDraft('')
    } catch (reason) {
      if (mount.current) {
        setError(errorMessage(reason))
      }
    } finally {
      window.clearTimeout(timeout)
      if (mount.current) setState('idle')
    }
  }

  function reset() {
    conversation.current = ''
    retry.current = ''
    setSelected('')
    setMore(false)
    setTurns([])
    setDraft('')
    setClip(null)
    setError('')
  }

  async function openConversation(id: string) {
    if (state !== 'idle' || loading) return
    if (!id) { reset(); return }
    setLoading(true)
    setError('')
    try {
      const result = await accountApi<{ turns: Turn[]; more: boolean }>(`turns?conversation=${encodeURIComponent(id)}`)
      reset()
      conversation.current = id
      setSelected(id)
      setTurns(result.turns)
      setMore(result.more)
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setLoading(false) }
  }

  async function loadOlder() {
    if (!selected || !turns[0] || state !== 'idle' || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await accountApi<{ turns: Turn[]; more: boolean }>(
        `turns?conversation=${encodeURIComponent(selected)}&before=${encodeURIComponent(turns[0].id)}`)
      setTurns(previous => [...result.turns, ...previous])
      setMore(result.more)
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setLoading(false) }
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

  return <section className="practice">
    <header className="practice-header">
      <h1 lang="en">{voice ? 'Speaking Practice' : 'AI Tutor'}</h1>
      <p>{voice ? 'Parle en anglais, puis écoute la réponse de Nova.' : 'Écris en anglais et reçois des corrections expliquées en français.'}</p>
    </header>
    <section className="practice-chat" aria-label="Conversation avec Nova">
      <div className="practice-toolbar">
        <label>Historique <select value={selected} disabled={state !== 'idle' || loading} onChange={event => openConversation(event.target.value)}>
          <option value="">Nouvelle conversation</option>
          {conversations.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
        </select></label>
        <button type="button" className="text-link" disabled={state !== 'idle' || loading} onClick={reset}>
          <RotateCcw size={16} aria-hidden="true" /> Nouvelle conversation</button>
      </div>
      {voice && <div className={`speaking-avatar ${state === 'recording' ? 'speaking-active' : ''}`}>
        <AudioLines aria-hidden="true" /><img src="/mate.svg" alt="Nova" width="72" height="72" /><AudioLines aria-hidden="true" />
      </div>}
      <div className="practice-thread" role="log" aria-label="Messages">
        {more && <button className="text-link" type="button" disabled={loading || state !== 'idle'} onClick={loadOlder}>Afficher les messages précédents</button>}
        {loading && <p role="status">Chargement de la conversation…</p>}
        {!turns.length && <p className="practice-welcome" lang="en">Hi, I’m Nova! What would you like to talk about today?</p>}
        {turns.map(turn => {
          const separator = turn.reply.match(/💬\s*(?:Nova)?\s*[:\n\-–]?/i)
          const corrections = separator?.index === undefined ? '' : turn.reply.slice(0, separator.index).replace(/^💡\s*Corrections(?:\s*&\s*Conseils)?\s*:\s*/i, '').trim()
          const answer = separator?.index === undefined ? turn.reply : turn.reply.slice(separator.index + separator[0].length).trim()
          return <div className="practice-turn" key={turn.id}>
            <div className="practice-user"><strong>{voice ? 'Ton vocal · Transcription' : 'Toi'}</strong><p>{turn.message}</p></div>
            {corrections && <div className="practice-correction"><strong>Corrections</strong><p>{corrections}</p></div>}
            <div className="practice-reply"><strong>Nova</strong><p lang="en">{answer}</p>
              {turn.audio ? <audio controls preload="none" src={`data:audio/mpeg;base64,${turn.audio}`} aria-label="Réponse audio en anglais" /> :
                <button className="text-link" type="button" disabled={audioPending.includes(turn.id)} onClick={() => play(turn.id)}>
                  <Headphones size={16} aria-hidden="true" />{audioPending.includes(turn.id) ? 'Préparation…' : 'Écouter la réponse'}</button>}
            </div>
          </div>
        })}
        {state === 'sending' && <p role="status">{voice ? 'Nova transcrit ton vocal, prépare les corrections et génère la réponse audio…' : 'Nova prépare ta réponse…'}</p>}
        <div ref={end} />
      </div>
      <form className="practice-form" onSubmit={send}>
        {clip ? <div className="practice-preview">
          <audio controls src={clip.url} aria-label="Réécouter ton enregistrement" />
          <button className="text-link" type="button" disabled={state !== 'idle'} onClick={() => { setClip(null); setError(''); retry.current = '' }}>Annuler le vocal</button>
        </div> : !voice && <label htmlFor="practice-message">Ton message<textarea id="practice-message" value={draft}
          disabled={state !== 'idle' || loading} placeholder="Write something in English…" rows={3} maxLength={1500} onChange={event => {
            retry.current = ''
            setDraft(event.target.value)
          }} /></label>}
        {!voice && !turns.length && !draft && <div className="practice-suggestions">
          {starters.map(text => <button className="text-link" type="button" disabled={loading || state !== 'idle'} key={text} onClick={() => setDraft(text)}>{text}</button>)}
        </div>}
        <div className="practice-actions">
          {voice && !clip && (state === 'recording'
            ? <button className="button practice-secondary" type="button" onClick={() => recorder.current?.stop()}><Square size={16} /> Arrêter</button>
            : <button className="button practice-mic" type="button" disabled={state !== 'idle' || loading} onClick={startRecording}><Mic size={21} /> Enregistrer un vocal</button>)}
          <button className="button" type="submit" disabled={state !== 'idle' || loading || (voice ? !clip : !draft.trim())}><Send size={17} /> Envoyer</button>
          {voice && <Link className="text-link" to="/app/tutor">Continuer à l’écrit</Link>}
        </div>
        {state === 'recording' && <p role="status">Enregistrement en cours. Durée maximale de 45 secondes.</p>}
        {state === 'permission' && <div>
          <p role="status">En attente de l’autorisation du micro.</p>
          <button type="button" className="text-link" onClick={() => {
            microphoneAttempt.current++
            setState('idle')
          }}>Annuler la demande</button>
        </div>}
        {error && <p className="practice-error" role="alert">{error}</p>}
      </form>
    </section>
  </section>
}
