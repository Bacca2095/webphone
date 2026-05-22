import './assets/main.css'

import type { App, Plugin } from 'vue'
import { useWebPhoneStore } from './stores/webphone'

export { useWebPhone } from './composables/useWebPhone'
export { useAudioDevices } from './composables/useAudioDevices'
export { useWebPhoneStore } from './stores/webphone'
export { default as WebPhone } from './components/WebPhone.vue'
export type { CallInfo, CallStatus, CallDirection, WebPhoneConfig, Contact, ContactType } from './types'
export type { PermissionState } from './composables/useAudioDevices'

export const WebPhonePlugin: Plugin = {
  install(_app: App) {
    useWebPhoneStore()
  },
}
