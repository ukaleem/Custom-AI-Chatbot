const STRINGS = {
  en: {
    placeholder: 'Type a message...',
    openChat: 'Chat with Guide',
    closeChat: 'Close',
    send: 'Send',
    error: 'Something went wrong. Please try again.',
    online: 'Online',
  },
  it: {
    placeholder: 'Scrivi un messaggio...',
    openChat: 'Chatta con la Guida',
    closeChat: 'Chiudi',
    send: 'Invia',
    error: 'Qualcosa è andato storto. Riprova.',
    online: 'Online',
  },
  de: {
    placeholder: 'Nachricht eingeben...',
    openChat: 'Mit Guide chatten',
    closeChat: 'Schließen',
    send: 'Senden',
    error: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    online: 'Online',
  },
  fr: {
    placeholder: 'Tapez un message...',
    openChat: 'Discuter avec le Guide',
    closeChat: 'Fermer',
    send: 'Envoyer',
    error: "Quelque chose s'est mal passé. Veuillez réessayer.",
    online: 'En ligne',
  },
  es: {
    placeholder: 'Escribe un mensaje...',
    openChat: 'Chatear con la Guía',
    closeChat: 'Cerrar',
    send: 'Enviar',
    error: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    online: 'En línea',
  },
} as const;

type Lang = keyof typeof STRINGS;
type Key = keyof typeof STRINGS['en'];

export class I18nService {
  private lang: Lang;

  constructor(language: string) {
    const resolved = language === 'auto'
      ? navigator.language.split('-')[0]
      : language;
    this.lang = (resolved in STRINGS ? resolved : 'en') as Lang;
  }

  t(key: Key): string {
    return (STRINGS[this.lang] as Record<string, string>)[key] ?? STRINGS['en'][key];
  }
}
