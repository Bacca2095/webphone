import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { WebPhoneConfig } from '@/types'

const sipConfig = useLocalStorage<Omit<WebPhoneConfig, 'iceServers'>>('webphone-sip-config', {
  server: '',
  uri: '',
  password: '',
  displayName: '',
})

export function useSipConfig() {
  const isConfigured = computed(
    () => !!sipConfig.value.server && !!sipConfig.value.uri && !!sipConfig.value.password,
  )
  return { sipConfig, isConfigured }
}
