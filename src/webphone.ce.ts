import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import WebPhone from './components/WebPhone.vue'
import styles from './assets/main.css?inline'

const pinia = createPinia()

// Remap global CSS selectors to Shadow DOM equivalents so Tailwind dark-mode works inside the shadow root.
const adaptCssForShadowDom = (css: string): string =>
  css
    .replace(/:root\s*\{/g, ':host {')
    .replace(/\.dark\s*\{/g, ':host(.dark) {')
    .replace(/:is\(\.dark \*\)/g, ':is(:host(.dark) *)')

export const WebPhoneElement = defineCustomElement(WebPhone, {
  styles: [adaptCssForShadowDom(styles)],
  configureApp(app) {
    app.use(pinia)
  },
})

customElements.define('web-phone', WebPhoneElement)
