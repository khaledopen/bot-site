import { createContext, useContext, useEffect, useId, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChartNoAxesColumn, LayoutDashboard, LogOut, MessageCircle, Mic, Send, Settings } from 'lucide-react'
import { VisibilityButton } from '@/components/ui/btn-18'
import { accountApi, ApiError, defaults, errorMessage, goals, levels, modes, type Account, type Preferences } from './account'
import { TELEGRAM_BOT_URL } from './content'

type Session = {
  account: Account | null
  loading: boolean
  failure: string
  setAccount: (account: Account | null) => void
  refresh: () => Promise<void>
}

const AccountContext = createContext<Session | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  async function refresh() {
    setLoading(true)
    setFailure('')
    try { setAccount((await accountApi<{ account: Account }>('me')).account) }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) setAccount(null)
      else setFailure(errorMessage(error))
    } finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  return <AccountContext.Provider value={{ account, loading, failure, setAccount, refresh }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const session = useContext(AccountContext)
  if (!session) throw new Error('AccountProvider missing')
  return session
}

function PasswordField({ label, ...input }: Omit<ComponentProps<'input'>, 'id' | 'type'> & { label: string }) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return <div className="account-password">
    <label htmlFor={id}>{label}</label>
    <div className="password-field">
      <input {...input} id={id} type={visible ? 'text' : 'password'} />
      <VisibilityButton theme="dark" visible={visible} onVisibilityChange={setVisible} controls={id}
        fieldLabel={label} disabled={input.disabled} />
    </div>
  </div>
}

export function AuthPage({ mode }: { mode: 'register' | 'login' | 'recover' }) {
  const navigate = useNavigate()
  const { setAccount } = useAccount()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState('')
  const register = mode === 'register'
  const recover = mode === 'recover'
  const title = register ? 'Crée ton compte.' : recover ? 'Récupère ton compte.' : 'Connecte-toi.'

  async function checkUsername() {
    setAvailability('')
    const candidate = username.trim()
    try {
      const result = await accountApi<{ available: boolean }>('available', { username: candidate })
      setAvailability(result.available ? `« ${candidate} » est disponible.` : `« ${candidate} » est déjà pris.`)
    } catch (reason) { setAvailability(errorMessage(reason)) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (mode !== 'login' && password !== confirmation) {
      setError('Les deux mots de passe doivent être identiques.')
      return
    }
    setBusy(true)
    try {
      const result = await accountApi<{ account: Account; codes?: string[] }>(mode, { username, password, confirmation, code })
      setAccount(result.account)
      if (result.codes) setCodes(result.codes)
      else navigate(result.account.preferences ? '/app/dashboard' : '/onboarding', { replace: true })
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }

  function downloadCodes() {
    const url = URL.createObjectURL(new Blob([`EnglishMate AI — ${username.trim()}\n\n${codes.join('\n')}`], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'englishmate-recovery-codes.txt'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main id="main" className="wrap account-shell">
    <Link to="/" className="text-link"><ArrowLeft size={17} aria-hidden="true" /> Retour à l’accueil</Link>
    <div className="account-card">
      {codes.length ? <div className="account-form">
        <h1>Garde tes codes de récupération.</h1>
        <p>Chaque code fonctionne une seule fois. Garde-les en lieu sûr pour récupérer ton compte si tu oublies ton mot de passe.</p>
        <ul className="recovery-codes">{codes.map(item => <li key={item}><code>{item}</code></li>)}</ul>
        <button className="button practice-secondary" onClick={downloadCodes}>Télécharger les codes</button>
        <Link to="/onboarding" className="button" replace>J’ai gardé mes codes</Link>
      </div> : <form className="account-form" onSubmit={submit}>
        <h1>{title}</h1>
        {register && <p>Un pseudo et un mot de passe suffisent. Ton compte est gratuit.</p>}
        <label>Pseudo<input autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}"
          value={username} onChange={event => { setUsername(event.target.value); setAvailability('') }} /></label>
        {register && <div className="account-inline">
          <button type="button" className="text-link" disabled={!/^[a-z0-9_]{3,24}$/i.test(username.trim())}
            onClick={checkUsername}>Vérifier le pseudo</button>
          <span role="status">{availability}</span>
        </div>}
        {recover && <label>Code de récupération<input autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value)} /></label>}
        <PasswordField label={recover ? 'Nouveau mot de passe' : 'Mot de passe'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required minLength={10} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
        {mode !== 'login' && <PasswordField label="Confirme le mot de passe" required minLength={10} maxLength={128}
          autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} />}
        {error && <p role="alert" className="practice-error">{error}</p>}
        <button type="submit" className="button" disabled={busy}>{busy ? 'Un instant…' : register ? 'Créer mon compte' : recover ? 'Changer mon mot de passe' : 'Se connecter'}</button>
        <div className="account-inline">
          {mode === 'login' ? <><Link to="/register">Créer un compte</Link><Link to="/recover">Récupérer mon compte</Link></> : <Link to="/login">Se connecter</Link>}
          <Link to="/confidentialite">Confidentialité</Link>
        </div>
      </form>}
    </div>
  </main>
}

export function RequireAccount({ onboarding = false }: { onboarding?: boolean }) {
  const { account, failure, loading, refresh } = useAccount()
  if (loading) return <main id="main" className="wrap account-shell"><p role="status">Chargement de ton espace…</p></main>
  if (failure) return <main id="main" className="wrap account-shell"><p role="alert">{failure}</p><button className="button" onClick={refresh}>Réessayer</button></main>
  if (!account) return <Navigate to="/login" replace />
  if (!onboarding && !account.preferences) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function PreferencesForm({ onboarding = false }: { onboarding?: boolean }) {
  const { account, setAccount } = useAccount()
  const navigate = useNavigate()
  const [value, setValue] = useState(account?.preferences || defaults)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const fields = [
    { title: 'Ton niveau d’anglais', name: 'level', options: levels },
    { title: 'Ton objectif', name: 'goal', options: goals },
    { title: 'Ton mode préféré', name: 'mode', options: modes },
    { title: 'Ton temps quotidien', name: 'dailyMinutes', options: [[10, '10 minutes'], [20, '20 minutes'], [30, '30 minutes']] },
  ] as const

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (onboarding && step < fields.length - 1) { setStep(step + 1); return }
    setBusy(true)
    setStatus('')
    try {
      const result = await accountApi<{ account: Account }>('preferences', value)
      setAccount(result.account)
      if (onboarding) navigate('/app/dashboard', { replace: true })
      else setStatus('Préférences enregistrées.')
    } catch (reason) { setStatus(errorMessage(reason)) }
    finally { setBusy(false) }
  }

  return <form className="account-form" onSubmit={submit}>
    {onboarding && <p className="eyebrow">Étape {step + 1} sur {fields.length}</p>}
    {fields.map((field, index) => (!onboarding || index === step) &&
      <fieldset className="choice-field" key={field.name}>
        <legend>{field.title}</legend>
        <div className="choice-options">{field.options.map(([key, label]) =>
          <label key={key}><input type="radio" name={field.name} checked={value[field.name] === key} onChange={() =>
            setValue(previous => ({ ...previous, [field.name]: key }) as Preferences)} /><span>{label}</span></label>)}</div>
      </fieldset>)}
    <div className="account-inline">
      {onboarding && step > 0 && <button type="button" className="text-link" onClick={() => setStep(step - 1)}>Retour</button>}
      <button className="button" disabled={busy} type="submit">{onboarding ? step < fields.length - 1 ? 'Continuer' : 'Commencer' : 'Enregistrer'}</button>
    </div>
    {status && <p role="status">{status}</p>}
  </form>
}

export function Onboarding() {
  return <main id="main" className="wrap account-shell"><div className="account-card">
    <h1>Configure ta pratique.</h1><PreferencesForm onboarding />
  </div></main>
}

const navigation = [
  ['Dashboard', 'dashboard', LayoutDashboard], ['AI Tutor', 'tutor', MessageCircle],
  ['Speaking Practice', 'speaking', Mic], ['My Vocabulary', 'vocabulary', BookOpen],
  ['My Progress', 'progress', ChartNoAxesColumn], ['Settings', 'settings', Settings],
] as const

export function AppLayout() {
  const { account, setAccount } = useAccount()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
    try {
      await accountApi('logout', {})
      setAccount(null)
      navigate('/login', { replace: true })
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <main id="main" className="wrap app-layout">
    <aside className="app-sidebar">
      <p className="app-username">{account?.username}</p>
      <nav aria-label="Espace EnglishMate">
        {navigation.map(([label, route, Icon]) => <NavLink key={route} to={route}><Icon size={18} aria-hidden="true" />{label}</NavLink>)}
        <a href={TELEGRAM_BOT_URL}><Send size={18} aria-hidden="true" />Telegram</a>
        <button type="button" onClick={logout} disabled={busy}><LogOut size={18} aria-hidden="true" />Logout</button>
      </nav>
      {error && <p className="practice-error" role="alert">{error}</p>}
    </aside>
    <div className="app-content"><Outlet /></div>
  </main>
}

type Stats = { seconds: number; messages: number; conversations: number; words: number; activity: { day: string; messages: number; seconds: number }[] }
const duration = (seconds: number) => seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`

export function Dashboard({ progress = false }: { progress?: boolean }) {
  const { account } = useAccount()
  const preferences = account?.preferences
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    accountApi<Stats>('dashboard', undefined, controller.signal).then(setStats).catch(reason => {
      if (!controller.signal.aborted) setError(errorMessage(reason))
    })
    return () => controller.abort()
  }, [])
  return <section className="app-page">
    <h1 lang="en">{progress ? 'My Progress' : `Welcome back, ${account?.username}!`}</h1>
    {!progress && preferences && <article className="app-daily">
      <h2 lang="en">Ready for your {preferences.dailyMinutes}-minute English practice?</h2>
      <p lang="en">{levels.find(([key]) => key === preferences.level)?.[1]} · {goals.find(([key]) => key === preferences.goal)?.[1]}</p>
      <Link to={preferences.mode === 'voice' ? '/app/speaking' : '/app/tutor'} className="button">Démarrer ma séance</Link>
    </article>}
    {error && <p role="alert" className="practice-error">{error}</p>}
    {!stats && !error && <p role="status">Chargement de tes statistiques…</p>}
    {stats && <>
      <dl className="app-stats">
        <div><dt>Pratique vocale</dt><dd>{duration(stats.seconds)}</dd></div>
        <div><dt>Conversations</dt><dd>{stats.conversations}</dd></div>
        <div><dt>Mots enregistrés</dt><dd>{stats.words}</dd></div>
        <div><dt>Messages</dt><dd>{stats.messages}</dd></div>
      </dl>
      <article className="app-panel"><h2>Les sept derniers jours</h2>
        {stats.activity.length ? <ul className="app-activity">{stats.activity.map(day =>
          <li key={day.day}><time dateTime={day.day}>{new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day.day))}</time>
            <span>{day.messages} {day.messages === 1 ? 'message' : 'messages'} · {duration(day.seconds)} à l’oral</span></li>)}</ul>
          : <p>Ta première séance apparaîtra ici.</p>}
      </article>
    </>}
  </section>
}

type Word = { id: string; term: string; note: string }

export function Vocabulary() {
  const [words, setWords] = useState<Word[]>([])
  const [term, setTerm] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true)
    accountApi<{ words: Word[] }>('vocabulary', undefined, controller.signal).then(result => setWords(result.words))
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)) })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { word } = await accountApi<{ word: Word }>('vocabulary', { term, note })
      setWords(previous => [word, ...previous.filter(item => item.id !== word.id)])
      setTerm('')
      setNote('')
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    setError('')
    setBusy(true)
    try {
      await accountApi('delete-word', { id })
      setWords(previous => previous.filter(word => word.id !== id))
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }

  return <section className="app-page"><h1 lang="en">My Vocabulary</h1>
    <form className="account-form app-panel" onSubmit={save}>
      <label>Mot ou expression<input required maxLength={100} value={term} onChange={event => setTerm(event.target.value)} /></label>
      <label>Définition ou exemple<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
      <button className="button" type="submit" disabled={busy}>Enregistrer le mot</button>
    </form>
    {error && <p role="alert" className="practice-error">{error}</p>}
    <ul className="app-list">{words.map(word => <li className="app-panel" key={word.id}>
      <strong lang="en">{word.term}</strong><p>{word.note}</p>
      <button className="text-link" disabled={busy} onClick={() => remove(word.id)}>Retirer</button>
    </li>)}</ul>
  </section>
}

export function AccountSettings() {
  const { setAccount } = useAccount()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function remove(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await accountApi('delete-account', { password })
      setAccount(null)
      navigate('/', { replace: true })
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <section className="app-page"><h1>Préférences.</h1>
    <div className="app-panel"><PreferencesForm /></div>
    <details className="app-panel account-delete">
      <summary>Supprimer mon compte</summary>
      <form className="account-form" onSubmit={remove}>
        <p>Ton compte, tes conversations et ton vocabulaire seront supprimés.</p>
        <PasswordField label="Confirme avec ton mot de passe" required autoComplete="current-password"
          value={password} onChange={event => setPassword(event.target.value)} />
        {error && <p className="practice-error" role="alert">{error}</p>}
        <button className="button" disabled={busy || !password}>Supprimer définitivement</button>
      </form>
    </details>
  </section>
}
