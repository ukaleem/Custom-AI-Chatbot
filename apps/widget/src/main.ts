import { CataniaBotElement } from './chatbot.element';

if (!customElements.get('catania-bot')) {
  customElements.define('catania-bot', CataniaBotElement);
}
