import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import WebPhone from './components/WebPhone.vue'
import styles from './assets/main.css?inline'

const pinia = createPinia()

const wcStyles = styles
  .replace(/:root\s*\{/g, ':host {')
  .replace(/\.dark\s*\{/g, ':host(.dark) {')
  .replace(/:is\(\.dark \*\)/g, ':is(:host(.dark) *)')

export const WebPhoneElement = defineCustomElement(WebPhone, {
  styles: [wcStyles],
  configureApp(app) {
    app.use(pinia)
  },
})

customElements.define('web-phone', WebPhoneElement)
