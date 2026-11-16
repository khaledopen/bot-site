export const TELEGRAM_BOT_URL = 'https://t.me/EnglishMate_KB_bot'

export const levels = [
  {
    label: 'Débutant', title: 'Beginner', color: 'mint',
    description: 'Je découvre l’anglais et je veux apprendre à construire mes premières phrases.',
    detail: 'Présente-toi en deux phrases et dis ce que tu aimes faire.',
    example: 'Hi, I’m Maya. I like cooking.',
  },
  {
    label: 'Intermédiaire', title: 'Intermediate', color: 'yellow',
    description: 'Je connais les bases, mais je veux parler plus naturellement.',
    detail: 'Raconte ton week-end et explique ce qui t’a plu.',
    example: 'I went hiking last weekend. I loved the view.',
  },
  {
    label: 'Avancé', title: 'Advanced', color: 'peach',
    description: 'Je veux enrichir mon vocabulaire, développer ma fluidité et améliorer mes conversations.',
    detail: 'Exprime ton avis et nuance-le avec un exemple concret.',
    example: 'Working from home saves time, but I do miss the conversations I have at the office.',
  },
]

export const routine = [
  { minutes: 5, title: 'Révision', description: 'Relis quelques mots et phrases de ta dernière conversation.' },
  { minutes: 10, title: 'Conversation écrite', description: 'Écris quelques phrases sur ta journée.' },
  { minutes: 10, title: 'Conversation vocale', description: 'Raconte un souvenir à voix haute, puis écoute la réponse.' },
  { minutes: 5, title: 'Corrections', description: 'Relis une correction et réutilise-la dans une nouvelle phrase.' },
]

export const faq = [
  ['EnglishMate AI est-il vraiment gratuit ?', 'Oui, la pratique écrite et vocale avec EnglishMate AI est 100 % gratuite.'],
  ['Dois-je installer une nouvelle application ?', 'Si tu utilises déjà Telegram, tu as tout ce qu’il te faut. Ouvre le lien du bot dans Telegram pour commencer.'],
  ['Puis-je utiliser le bot si je suis débutant ?', 'Oui. Choisis le niveau Débutant et commence avec quelques mots ou une phrase toute simple.'],
  ['Le bot comprend-il mes vocaux ?', 'Tu peux lui envoyer un vocal en anglais. Il analyse ton message, t’explique tes erreurs en français et te répond avec un vocal en anglais.'],
  ['Est-ce qu’il peut corriger ma grammaire ?', 'Oui. Tu peux lui envoyer une phrase en anglais ou lui poser une question de grammaire. Il explique les corrections en français.'],
  ['Puis-je poser des questions en français ?', 'Les corrections et les explications sont données en français. Pour pratiquer, envoie tes messages écrits ou vocaux en anglais.'],
  ['Comment choisir mon niveau ?', 'Au démarrage, sélectionne Débutant, Intermédiaire ou Avancé dans la conversation Telegram.'],
  ['Comment commencer sur Telegram ?', 'Ouvre EnglishMate AI sur Telegram, puis appuie sur Démarrer ou envoie /start. Choisis ensuite ton niveau et envoie ton premier message.'],
]
