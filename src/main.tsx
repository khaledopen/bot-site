import { StrictMode, useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useInView } from 'motion/react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Check, ChevronDown, ChevronLeft,
  CircleHelp, Gift, Headphones, Layers3, Menu, MessageCircle, Mic, Monitor, Send, Sparkle, X,
} from 'lucide-react'
import { faq, levels, routine, TELEGRAM_BOT_URL } from './content'
import Practice from './Practice'
import {
  AccountProvider, AccountSettings, AppLayout, AuthPage, Dashboard, Onboarding, RequireAccount,
  Vocabulary, useAccount,
} from './AccountPages'
import './style.css'

const navItems = [
  ['Fonctionnalités', 'fonctionnalites'],
  ['Comment ça marche', 'comment-ca-marche'],
  ['FAQ', 'faq'],
]

function TelegramLink({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <a className={`button ${className}`} href={TELEGRAM_BOT_URL}><Send size={18} aria-hidden="true" />{children}</a>
}

function Brand() {
  return <Link className="brand" to="/"><img src="/mate.svg" alt="" width="38" height="38" /><span>EnglishMate <em>AI</em></span></Link>
}

function Header() {
  const [open, setOpen] = useState(false)
  const { account } = useAccount()
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Brand />
        <button className="menu-toggle" type="button" aria-controls="site-nav" aria-expanded={open}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav id="site-nav" className={open ? 'navigation open' : 'navigation'} aria-label="Navigation principale">
          {navItems.map(([label, id]) => <Link key={id} onClick={() => setOpen(false)} to={`/#${id}`}>{label}</Link>)}
          <Link onClick={() => setOpen(false)} to={account ? '/app/dashboard' : '/login'}>{account ? 'Mon espace' : 'Se connecter'}</Link>
        </nav>
        <TelegramLink className="header-cta">Ouvrir Telegram</TelegramLink>
      </div>
    </header>
  )
}

const bars = [7, 13, 9, 17, 24, 14, 20, 28, 15, 23, 11, 19, 26, 13, 21, 10, 17, 24, 14, 8, 16, 11, 6]

function Wave({ large = false }: { large?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  return <span ref={ref} className={`wave ${large ? 'large-wave' : ''}`} data-animate={inView} aria-hidden="true">
    {bars.map((height, index) => <i key={index} style={{ height: large ? height * 2.9 : height, animationDelay: `${index * -0.09}s` }} />)}
  </span>
}

function VoiceBubble({ reply = false }: { reply?: boolean }) {
  return <div className={`voice-bubble ${reply ? 'reply' : ''}`}>
    <span className="voice-icon"><Mic size={17} aria-hidden="true" /></span>
    <div><Wave /><small>{reply ? 'Vocal en anglais' : 'Ton vocal en anglais'}</small></div>
  </div>
}

function Correction({ voice }: { voice: boolean }) {
  return <div className="correction">
    <strong><Sparkle size={15} aria-hidden="true" /> Petite correction</strong>
    {voice ? <>
      <p lang="en">Yesterday, I <del>go</del> <b>went</b> to the market.</p>
      <small>Avec « yesterday », utilise le passé. Le prétérit de <i lang="en">go</i> est <i lang="en">went</i>.</small>
    </> : <>
      <p lang="en">She <del>like</del> <b>likes</b> listening to music.</p>
      <small>Au présent simple, ajoute un « s » au verbe avec <i lang="en">he</i>, <i lang="en">she</i> ou <i lang="en">it</i>.</small>
    </>}
  </div>
}

function Phone() {
  return <div className="phone">
    <div className="phone-top">
      <ChevronLeft size={17} aria-hidden="true" /><img src="/mate.svg" alt="" width="34" height="34" />
      <div><strong>EnglishMate AI</strong><small>bot · Telegram</small></div>
      <span aria-hidden="true" className="phone-dots">···</span>
    </div>
    <div className="phone-chat">
      <span className="demo-label">Aperçu de conversation</span>
      <div className="chat-entry"><VoiceBubble /><p className="transcript" lang="en">“Yesterday, I go to the market.”</p></div>
      <div className="chat-entry"><Correction voice /></div>
      <div className="chat-entry"><VoiceBubble reply /><p className="transcript bot-transcript" lang="en">“Nice! What did you buy?”</p></div>
    </div>
    <div className="phone-bottom" aria-hidden="true"><span /></div>
  </div>
}

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ y: 18 }} whileInView={{ y: 0 }}
    viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.48 }}>{children}</motion.div>
}

function Hero() {
  return <section className="wrap hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <h1 id="hero-title" lang="en">Speak English.<br />Make Mistakes.<br /><em>Get Better.</em></h1>
      <p>Ton coach d'anglais personnel sur Telegram. Envoie un vocal, reçois des corrections simples en français et écoute une réponse en anglais. Pratique chaque jour, à ton rythme et gratuitement.</p>
      <p className="hero-slogan" lang="en">Your English Journey Starts Here.</p>
      <div className="hero-actions">
        <Link className="button practice-primary" to="/pratiquer"><MessageCircle size={18} aria-hidden="true" /> Pratiquer sur le Web</Link>
        <TelegramLink>Commencer gratuitement</TelegramLink>
      </div>
    </div>
    <div className="hero-art">
      <div className="orbit orbit-outer" /><div className="orbit orbit-inner" />
      <span className="art-spark" aria-hidden="true">✦</span>
      <Phone />
      <div className="art-note"><AudioLines size={21} aria-hidden="true" /> À toi de parler !</div>
      <div className="art-mascot" aria-hidden="true"><img src="/mate.svg" alt="" /></div>
    </div>
  </section>
}

function LearningOptions() {
  return <section className="section wrap learning-options" aria-labelledby="learning-options-title">
    <div className="section-heading">
      <h2 id="learning-options-title" lang="en">Choose how you want to learn.</h2>
      <p>Apprends l’anglais directement sur Telegram ou depuis ton navigateur. Ton coach IA t’accompagne où que tu sois.</p>
    </div>
    <div className="learning-cards">
      <article><Send size={29} aria-hidden="true" /><h3 lang="en">Learn on Telegram</h3>
        <p>Tu utilises déjà Telegram ? Retrouve ton professeur directement dans ton application préférée.</p>
        <TelegramLink><span lang="en">Open Telegram Bot</span></TelegramLink>
      </article>
      <article><Monitor size={29} aria-hidden="true" /><h3 lang="en">Learn on the Web</h3>
        <p>Pas de Telegram ? Aucun problème. Crée ton compte gratuitement et commence à apprendre directement ici.</p>
        <Link to="/register" className="button practice-primary" lang="en">Create Free Account <ArrowRight size={18} aria-hidden="true" /></Link>
      </article>
    </div>
  </section>
}

function PracticeEntry() {
  const { account, loading, failure } = useAccount()
  if (loading) return <main id="main" className="wrap account-shell"><p role="status">Chargement de ton espace…</p></main>
  return <Navigate to={account ? '/app/tutor' : failure ? '/login' : '/register'} replace />
}

function HowItWorks() {
  const [selected, setSelected] = useState(0)
  return <section className="section wrap" id="comment-ca-marche">
    <Reveal className="section-heading"><p className="eyebrow">Comment ça marche</p><h2>3 étapes pour commencer à parler anglais.</h2></Reveal>
    <div className="steps">
      <article><div className="step-icon"><Send /></div><h3>1. Ouvre EnglishMate AI sur Telegram</h3><p>Ouvre le bot puis appuie sur Démarrer, ou envoie <code>/start</code>.</p></article>
      <article><div className="step-icon"><Layers3 /></div><h3>2. Choisis ton niveau</h3><p>Essaie le sélecteur de niveau.</p>
        <div className="level-chips" role="group" aria-label="Aperçu des niveaux">
          {levels.map((level, index) => <button type="button" key={level.label} aria-pressed={selected === index} onClick={() => setSelected(index)}><i className={level.color} />{level.label}</button>)}
        </div>
        <p className="step-example" aria-live="polite" lang="en">{levels[selected].example}</p>
      </article>
      <article><div className="step-icon"><Mic /></div><h3>3. Parle ou écris en anglais</h3><p>Envoie ton premier vocal ou message écrit. Le bot t’accompagne avec des corrections et des réponses adaptées.</p></article>
    </div>
    <TelegramLink>Essayer EnglishMate AI</TelegramLink>
  </section>
}

function VoiceSection() {
  const voiceSteps = [
    ['Tu parles', 'Envoie un vocal depuis Telegram.'],
    ['Tu apprends', 'Le bot identifie tes erreurs et t’explique simplement comment t’améliorer.'],
    ['Tu écoutes', 'Reçois une réponse vocale en anglais pour travailler ta compréhension et ta prononciation.'],
  ]
  return <section className="voice-section" id="fonctionnalites">
    <div className="wrap voice-layout">
      <Reveal className="voice-art">
        <div className="voice-device"><div /><Mic aria-hidden="true" /></div>
        <Wave large />
        <span><Headphones size={18} aria-hidden="true" /> Réponse vocale en anglais</span>
      </Reveal>
      <Reveal>
        <p className="eyebrow">La pratique vocale</p>
        <h2>Le meilleur moyen d’apprendre à parler ? <em>C’est de parler.</em></h2>
        <ol className="voice-steps">
          {voiceSteps.map(([title, description], index) => <li key={title}><b aria-hidden="true">{index + 1}</b><div><h3>{title}</h3><p>{description}</p></div></li>)}
        </ol>
      </Reveal>
    </div>
  </section>
}

function LevelSection() {
  const [selected, setSelected] = useState(0)
  const level = levels[selected]
  return <section className="section wrap">
    <Reveal className="section-heading"><p className="eyebrow">Les niveaux</p><h2>Choisis ton niveau.</h2></Reveal>
    <div className="level-cards" role="group" aria-label="Exemples par niveau">
      {levels.map((item, index) => <button type="button" key={item.label} className={`level-card ${item.color}`}
        aria-pressed={index === selected} aria-controls="level-example" onClick={() => setSelected(index)}>
        <span className="level-card-top"><span>{item.label}</span>{index === selected ? <Check size={20} /> : <ArrowUpRight size={20} />}</span>
        <strong lang="en">{item.title}</strong><span>{item.description}</span>
      </button>)}
    </div>
    <div className="level-example" id="level-example">
      <div aria-live="polite"><strong>Exemple · {level.label}</strong><p>{level.detail}</p><p lang="en">« {level.example} »</p></div>
      <TelegramLink>Choisir sur Telegram</TelegramLink>
    </div>
  </section>
}

function DemoSection() {
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const voice = mode === 'voice'
  return <section className="demo-section">
    <div className="wrap demo-layout">
      <Reveal><p className="eyebrow">Deux façons de pratiquer</p><h2>Écris quand tu veux. Parle quand tu peux.</h2>
        <p>Envoie un vocal ou écris en anglais. Tu peux aussi poser une question de grammaire, demander le sens d’un mot ou pratiquer ton vocabulaire.</p>
        <div className="demo-switch" role="tablist" aria-label="Format de la démonstration"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 'voice' : event.key === 'End' ? 'text' : voice ? 'text' : 'voice'
            setMode(next)
            document.getElementById(`tab-${next}`)?.focus()
          }}>
          <button id="tab-voice" type="button" role="tab" aria-selected={voice} aria-controls="demo-panel" tabIndex={voice ? 0 : -1} onClick={() => setMode('voice')}><Mic size={17} /> <span lang="en">Voice</span></button>
          <button id="tab-text" type="button" role="tab" aria-selected={!voice} aria-controls="demo-panel" tabIndex={voice ? -1 : 0} onClick={() => setMode('text')}><MessageCircle size={17} /> <span lang="en">Text</span></button>
        </div>
      </Reveal>
      <div className="demo-window" id="demo-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} tabIndex={0}>
        <div className="demo-window-top"><img src="/mate.svg" alt="" width="35" height="35" /><strong>EnglishMate AI</strong><span>Aperçu</span></div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div className="demo-messages" key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            {voice ? <div className="demo-user"><VoiceBubble /><p className="transcript" lang="en">“Yesterday, I go to the market.”</p></div> :
              <p className="text-bubble" lang="en">She like listening to music.</p>}
            <Correction voice={voice} />
            {voice && <div><VoiceBubble reply /><p className="transcript bot-transcript" lang="en">“Nice! What did you buy?”</p></div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </section>
}

const benefits = [
  [Gift, '100 % gratuit'], [Send, 'Sur Telegram'], [Layers3, 'Trois niveaux'], [MessageCircle, 'Conversations écrites'],
  [Mic, 'Conversations vocales'], [Check, 'Corrections expliquées en français'], [Headphones, 'Réponses vocales en anglais'], [Sparkle, 'Apprentissage sans pression'],
] as const

function Benefits() {
  return <section className="section wrap">
    <Reveal className="section-heading"><h2>Pourquoi EnglishMate AI ?</h2><p>Tu peux hésiter, chercher tes mots et recommencer. Les erreurs font partie de l’apprentissage.</p></Reveal>
    <ul className="benefits">{benefits.map(([Icon, label]) => <li key={label}><Icon size={23} aria-hidden="true" />{label}</li>)}</ul>
  </section>
}

function Routine() {
  return <section className="routine-section">
    <div className="wrap section">
      <Reveal className="section-heading"><p className="eyebrow">Ta routine d’anglais</p><h2>30 minutes par jour pour prendre confiance en anglais.</h2><p>Une idée de routine à adapter à ton rythme sur Telegram.</p></Reveal>
      <ol className="timeline">{routine.map((step) => <li key={step.title}><Reveal>
        <span className="minutes">{step.minutes} min</span><h3>{step.title}</h3><p>{step.description}</p>
      </Reveal></li>)}</ol>
    </div>
  </section>
}

function FAQ() {
  return <section id="faq" className="section wrap faq-layout">
    <Reveal><p className="eyebrow">FAQ</p><h2>Questions fréquentes.</h2><CircleHelp className="faq-icon" size={56} strokeWidth={1.3} aria-hidden="true" /></Reveal>
    <div className="faq-list">{faq.map(([question, answer]) => <details key={question} name="englishmate-faq">
      <summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p>
    </details>)}</div>
  </section>
}

function Home() {
  return <main id="main">
    <Hero /><BrandFilm /><LearningOptions /><HowItWorks /><VoiceSection /><LevelSection /><DemoSection /><Benefits /><Routine /><FAQ />
    <section className="wrap final-wrap"><div className="final-cta">
      <img src="/mate.svg" alt="" width="78" height="78" />
      <h2>Ton anglais progresse, une conversation à la fois.</h2>
      <p>Ton coach d’anglais intelligent, disponible directement sur Telegram. Parle, écris, fais des erreurs et progresse chaque jour, gratuitement.</p>
      <TelegramLink>Commencer gratuitement</TelegramLink>
    </div></section>
  </main>
}

function BrandFilm() {
  return <section className="wrap brand-film" aria-labelledby="brand-film-title">
    <div className="brand-film-copy">
      <h2 id="brand-film-title">Ose <em>l’anglais.</em></h2>
      <p>Écris, parle et progresse à ton rythme sur le Web ou dans Telegram.</p>
    </div>
    <video controls playsInline preload="none" width="1280" height="720"
      poster="/englishmate-film-poster.webp" aria-label="Film EnglishMate AI, 15 secondes">
      <source src="/englishmate-film.mp4" type="video/mp4" />
      <track kind="captions" src="/englishmate-film.fr.vtt" srcLang="fr" label="Français" />
      <a href="/englishmate-film.mp4">Télécharger le film EnglishMate AI</a>
    </video>
  </section>
}

function Privacy() {
  return <main id="main" className="wrap section privacy">
    <Link to="/" className="text-link"><ArrowRight className="back-arrow" size={17} /> Retour à l’accueil</Link>
    <h1>Confidentialité</h1>
    <h2>Tes échanges avec EnglishMate AI</h2>
    <p>Quand tu écris à EnglishMate AI ou que tu lui envoies un vocal en message direct, ton échange se déroule dans une conversation privée sur Telegram. Les autres utilisateurs du bot ne voient pas tes messages dans leur propre conversation.</p>
    <h2>Comment le bot utilise tes messages</h2>
    <p>Telegram transmet ton texte ou ton vocal à EnglishMate AI. Le bot analyse ton message pour te répondre et, si besoin, t’expliquer une correction en français. Quand tu envoies un vocal, le bot peut te répondre à l’oral en anglais.</p>
    <p><a href="https://telegram.org/privacy#6-bot-messages">En savoir plus sur les données transmises aux bots Telegram <ArrowUpRight size={16} aria-hidden="true" /></a></p>
    <h2>Sur ce site</h2>
    <p>Le site présente des exemples et propose une page de pratique Web. Le navigateur demande l’accès au micro quand tu démarres un enregistrement. Tu peux écouter ou annuler ton vocal avant de l’envoyer. Ton navigateur charge les polices depuis Google Fonts.</p>
    <h2>Sur la page de pratique Web</h2>
    <p>Ton compte Web utilise un pseudo, un mot de passe haché et un cookie de session. Tes préférences, tes messages, les transcriptions, les réponses et tes mots enregistrés sont conservés dans Supabase pour que tu puisses retrouver ton espace. Tu peux supprimer ces données en supprimant ton compte depuis les réglages.</p>
    <p>Le serveur transmet à Groq les messages que tu envoies pour produire une réponse ou transcrire un vocal. La synthèse vocale de Google reçoit la partie anglaise de la réponse. Le site traite les enregistrements pour produire une transcription et conserve seulement le texte de cette transcription dans ton historique. Tes conversations Web n’apparaissent pas dans le canal admin Telegram.</p>
  </main>
}

function Footer() {
  return <footer className="site-footer"><div className="wrap">
    <div className="footer-main">
      <div><Brand /><p lang="en">Your daily English learning companion.</p></div>
      <nav aria-label="Pied de page"><Link to="/">Accueil</Link>{navItems.map(([label, id]) => <Link key={id} to={`/#${id}`}>{label}</Link>)}
        <a href={TELEGRAM_BOT_URL}>Telegram <ArrowUpRight size={14} /></a><Link to="/confidentialite">Confidentialité</Link>
      </nav>
    </div>
    <div className="footer-bottom"><span lang="en">Created by byBEn10</span><span>Projet indépendant, sans affiliation officielle avec Telegram.</span></div>
  </div></footer>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><MotionConfig reducedMotion="user"><AccountProvider>
    <a className="skip-link" href="#main">Aller au contenu</a><Header />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pratiquer" element={<PracticeEntry />} />
      <Route path="/register" element={<AuthPage key="register" mode="register" />} />
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route path="/recover" element={<AuthPage key="recover" mode="recover" />} />
      <Route path="/confidentialite" element={<Privacy />} />
      <Route element={<RequireAccount onboarding />}><Route path="/onboarding" element={<Onboarding />} /></Route>
      <Route element={<RequireAccount />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tutor" element={<Practice key="written" />} />
          <Route path="speaking" element={<Practice key="voice" voice />} />
          <Route path="vocabulary" element={<Vocabulary />} />
          <Route path="progress" element={<Dashboard progress />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<main id="main" className="section wrap privacy"><h1>Page introuvable</h1><Link className="text-link" to="/">Retour à l’accueil <ArrowRight size={17} /></Link></main>} />
    </Routes>
    <Footer />
  </AccountProvider></MotionConfig></BrowserRouter></StrictMode>,
)
