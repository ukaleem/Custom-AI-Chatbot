import { ConfigService, WidgetConfig } from './services/config.service';
import { ChatService, ChatResponse } from './services/chat.service';
import { I18nService } from './services/i18n.service';
import { ThemeService } from './services/theme.service';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

const CHAT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const SEND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>`;

function buildStyles(color: string, isRight: boolean): string {
  const dark = ThemeService.darken(color);
  return `
    :host { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .launcher {
      position: fixed; ${isRight ? 'right:24px' : 'left:24px'}; bottom: 24px; z-index: 2147483646;
      width: 56px; height: 56px; border-radius: 50%; background: ${color};
      border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.22);
      display: flex; align-items: center; justify-content: center;
      color: #fff; transition: transform .2s, box-shadow .2s;
    }
    .launcher:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.28); }
    .launcher svg { width: 24px; height: 24px; }

    .chat-window {
      position: fixed; ${isRight ? 'right:24px' : 'left:24px'}; bottom: 92px; z-index: 2147483645;
      width: 360px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,.16);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(16px) scale(.97); pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
    }
    .chat-window.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

    .header {
      background: ${color}; color: #fff; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .header-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.22); display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; font-size: 18px;
    }
    .header-info { flex: 1; min-width: 0; }
    .header-name { font-weight: 600; font-size: 15px; }
    .header-status { font-size: 11px; opacity: .85; margin-top: 1px; }
    .header-close {
      background: none; border: none; color: #fff; cursor: pointer;
      opacity: .8; padding: 4px; border-radius: 6px;
      display: flex; align-items: center; transition: opacity .15s; flex-shrink: 0;
    }
    .header-close:hover { opacity: 1; }
    .header-close svg { width: 18px; height: 18px; }

    .messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f8fafc; scroll-behavior: smooth;
    }
    .messages::-webkit-scrollbar { width: 4px; }
    .messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

    .message { display: flex; flex-direction: column; max-width: 78%; animation: fadeUp .18s ease; }
    .message.bot { align-self: flex-start; }
    .message.user { align-self: flex-end; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

    .bubble { padding: 10px 14px; border-radius: 16px; line-height: 1.5; font-size: 13.5px; white-space: pre-wrap; word-break: break-word; }
    .message.bot .bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
    .message.user .bubble { background: ${color}; color: #fff; border-bottom-right-radius: 4px; }

    .typing {
      display: flex; align-items: center; gap: 4px;
      padding: 12px 16px; background: #f1f5f9;
      border-radius: 16px; border-bottom-left-radius: 4px;
      align-self: flex-start; animation: fadeUp .18s ease;
    }
    .typing-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
      animation: bounce 1.2s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: .2s; }
    .typing-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes bounce { 0%,60%,100% { transform:translateY(0); opacity:.5; } 30% { transform:translateY(-5px); opacity:1; } }

    .quick-replies {
      padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px;
      border-top: 1px solid #e2e8f0; background: #fff; flex-shrink: 0;
    }
    .quick-replies:empty { display: none; }
    .qr-btn {
      background: none; border: 1.5px solid ${color}; color: ${color};
      padding: 5px 12px; border-radius: 20px; cursor: pointer;
      font-size: 12.5px; font-family: inherit; transition: all .15s; white-space: nowrap;
    }
    .qr-btn:hover { background: ${color}; color: #fff; }

    .input-area {
      display: flex; gap: 8px; padding: 10px 12px;
      border-top: 1px solid #e2e8f0; background: #fff;
      flex-shrink: 0; align-items: flex-end;
    }
    .input-field {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 22px;
      padding: 9px 14px; font-size: 13.5px; font-family: inherit;
      outline: none; resize: none; max-height: 80px; line-height: 1.4;
      color: #1e293b; transition: border-color .15s;
    }
    .input-field:focus { border-color: ${color}; }
    .input-field::placeholder { color: #94a3b8; }
    .input-field:disabled { background: #f8fafc; cursor: not-allowed; }

    .send-btn {
      width: 38px; height: 38px; border-radius: 50%; background: ${color};
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #fff; flex-shrink: 0;
      transition: background .15s, transform .1s;
    }
    .send-btn:hover { background: ${dark}; }
    .send-btn:active { transform: scale(.92); }
    .send-btn:disabled { opacity: .45; cursor: default; }
    .send-btn svg { width: 16px; height: 16px; }

    @media (max-width: 400px) {
      .chat-window { right:0!important; left:0!important; bottom:0!important; width:100vw!important; max-width:100vw!important; height:100vh!important; max-height:100vh!important; border-radius:0!important; }
      .launcher { right:16px!important; left:auto!important; bottom:80px!important; }
    }
  `;
}

export class CataniaBotElement extends HTMLElement {
  static observedAttributes = ['tenant-id', 'language', 'primary-color', 'bot-name', 'position', 'api-url'];

  private shadow!: ShadowRoot;
  private config!: WidgetConfig;
  private chatService!: ChatService;
  private i18n!: I18nService;
  private sessionId: string | null = null;
  private isOpen = false;
  private messages: Message[] = [];
  private quickReplies: string[] = [];
  private initialized = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.config = ConfigService.fromElement(this);
    this.chatService = new ChatService(this.config);
    this.i18n = new I18nService(this.config.language);
    this.render();
    this.initialized = true;
  }

  attributeChangedCallback() {
    if (!this.initialized) return;
    this.config = ConfigService.fromElement(this);
    this.i18n = new I18nService(this.config.language);
    this.chatService = new ChatService(this.config);
    this.render();
  }

  private render() {
    const { botName, primaryColor, position } = this.config;
    const isRight = position !== 'bottom-left';
    const i18n = this.i18n;

    this.shadow.innerHTML = `
      <style>${buildStyles(primaryColor, isRight)}</style>

      <button class="launcher" title="${i18n.t('openChat')}" aria-label="${i18n.t('openChat')}">
        ${CHAT_ICON}
      </button>

      <div class="chat-window${this.isOpen ? ' open' : ''}" role="dialog" aria-label="Chat with ${botName}">
        <div class="header">
          <div class="header-avatar">🤖</div>
          <div class="header-info">
            <div class="header-name">${botName}</div>
            <div class="header-status">● ${i18n.t('online')}</div>
          </div>
          <button class="header-close" aria-label="${i18n.t('closeChat')}">${CLOSE_ICON}</button>
        </div>

        <div class="messages" id="messages">
          ${this.messages.map(m => this.messageTpl(m)).join('')}
        </div>

        <div class="quick-replies" id="quick-replies">
          ${this.quickReplies.map(qr => `<button class="qr-btn" data-reply="${qr}">${qr}</button>`).join('')}
        </div>

        <div class="input-area">
          <textarea
            class="input-field" id="input" rows="1"
            placeholder="${i18n.t('placeholder')}"
            ${!this.sessionId ? 'disabled' : ''}
          ></textarea>
          <button class="send-btn" id="send-btn" aria-label="${i18n.t('send')}" ${!this.sessionId ? 'disabled' : ''}>
            ${SEND_ICON}
          </button>
        </div>
      </div>
    `;

    this.attachListeners();
    requestAnimationFrame(() => this.scrollToBottom());
  }

  private messageTpl(msg: Message): string {
    return `<div class="message ${msg.role}"><div class="bubble">${this.esc(msg.text)}</div></div>`;
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private attachListeners() {
    this.shadow.querySelector('.launcher')?.addEventListener('click', () => this.toggle());
    this.shadow.querySelector('.header-close')?.addEventListener('click', () => this.close());
    this.shadow.getElementById('send-btn')?.addEventListener('click', () => this.submit());

    const input = this.inputEl;
    input?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });
    input?.addEventListener('input', () => {
      if (input) { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 80) + 'px'; }
    });

    this.shadow.querySelectorAll('.qr-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const r = btn.getAttribute('data-reply');
        if (r) this.sendMessage(r);
      })
    );
  }

  private get inputEl(): HTMLTextAreaElement | null {
    return this.shadow.getElementById('input') as HTMLTextAreaElement | null;
  }

  private toggle() {
    this.isOpen ? this.close() : this.open();
  }

  private open() {
    this.isOpen = true;
    this.shadow.querySelector('.chat-window')?.classList.add('open');
    if (!this.sessionId) this.initSession();
    else requestAnimationFrame(() => this.inputEl?.focus());
  }

  private close() {
    this.isOpen = false;
    this.shadow.querySelector('.chat-window')?.classList.remove('open');
  }

  private async initSession() {
    this.setTyping(true);
    try {
      const lang = this.config.language === 'auto' ? navigator.language.split('-')[0] : this.config.language;
      const res = await this.chatService.startSession(lang);
      this.sessionId = res.sessionId;
      this.pushBotMsg(res);
      this.enableInput();
    } catch {
      this.appendMessage({ role: 'bot', text: this.i18n.t('error') });
    } finally {
      this.setTyping(false);
    }
  }

  private async submit() {
    const input = this.inputEl;
    const text = input?.value.trim();
    if (!text || !this.sessionId) return;

    input!.value = '';
    input!.style.height = 'auto';
    this.appendMessage({ role: 'user', text });
    this.clearQr();
    this.setTyping(true);
    this.disableInput();

    try {
      const res = await this.chatService.sendMessage(this.sessionId, text);
      this.pushBotMsg(res);
    } catch {
      this.appendMessage({ role: 'bot', text: this.i18n.t('error') });
    } finally {
      this.setTyping(false);
      this.enableInput();
    }
  }

  private async sendMessage(text: string) {
    if (!this.sessionId) return;
    this.appendMessage({ role: 'user', text });
    this.clearQr();
    this.setTyping(true);
    this.disableInput();

    try {
      const res = await this.chatService.sendMessage(this.sessionId, text);
      this.pushBotMsg(res);
    } catch {
      this.appendMessage({ role: 'bot', text: this.i18n.t('error') });
    } finally {
      this.setTyping(false);
      this.enableInput();
    }
  }

  private pushBotMsg(res: ChatResponse) {
    this.appendMessage({ role: 'bot', text: res.message });
    if (res.quickReplies?.length) this.setQr(res.quickReplies);
  }

  private appendMessage(msg: Message) {
    this.messages.push(msg);
    const container = this.shadow.getElementById('messages');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = this.messageTpl(msg);
    container.appendChild(div.firstElementChild!);
    this.scrollToBottom();
  }

  private setTyping(show: boolean) {
    const container = this.shadow.getElementById('messages');
    if (!container) return;
    const existing = container.querySelector('.typing');
    if (show && !existing) {
      const el = document.createElement('div');
      el.className = 'typing';
      el.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
      container.appendChild(el);
      this.scrollToBottom();
    } else if (!show && existing) {
      existing.remove();
    }
  }

  private setQr(replies: string[]) {
    this.quickReplies = replies;
    const container = this.shadow.getElementById('quick-replies');
    if (!container) return;
    container.innerHTML = replies.map(qr => `<button class="qr-btn" data-reply="${qr}">${qr}</button>`).join('');
    container.querySelectorAll('.qr-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const r = btn.getAttribute('data-reply');
        if (r) this.sendMessage(r);
      })
    );
  }

  private clearQr() {
    this.quickReplies = [];
    const container = this.shadow.getElementById('quick-replies');
    if (container) container.innerHTML = '';
  }

  private enableInput() {
    const input = this.inputEl;
    const btn = this.shadow.getElementById('send-btn') as HTMLButtonElement | null;
    if (input) input.disabled = false;
    if (btn) btn.disabled = false;
    input?.focus();
  }

  private disableInput() {
    const input = this.inputEl;
    const btn = this.shadow.getElementById('send-btn') as HTMLButtonElement | null;
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
  }

  private scrollToBottom() {
    const container = this.shadow.getElementById('messages');
    if (container) container.scrollTop = container.scrollHeight;
  }
}
