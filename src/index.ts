import './assets/main.css'

import type { App, Plugin } from 'vue'
import WebPhoneComponent from './components/WebPhone.vue'
import { useWebPhoneStore } from './stores/webphone'

const WebPhone = WebPhoneComponent as typeof WebPhoneComponent & Plugin
WebPhone.install = (_app: App) => {
  useWebPhoneStore()
}

export { WebPhone }
export { useWebPhone } from './composables/useWebPhone'
export { useAudioDevices } from './composables/useAudioDevices'
export { useWebPhoneStore } from './stores/webphone'
export { default as NotesPanel } from './components/panels/NotesPanel.vue'
export { default as HistoryPanel } from './components/panels/HistoryPanel.vue'
export { default as ContactsPanel } from './components/panels/ContactsPanel.vue'
export { default as CalendarPanel } from './components/panels/CalendarPanel.vue'
export { useContacts } from './composables/useContacts'
export type { CallInfo, CallStatus, CallDirection, WebPhoneConfig, Contact, ContactType, PhoneNote, NoteColor, ScheduledCall } from './types'
export type { MicPermission } from './composables/useAudioDevices'
