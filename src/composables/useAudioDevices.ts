import { ref, computed, watch } from 'vue'
import { setOutputDevice, setOutputVolume } from '../core/sip'

export type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied'

export const useAudioDevices = () => {
  const permission = ref<PermissionState>('unknown')
  const devices = ref<MediaDeviceInfo[]>([])
  const selectedInputId = ref('')
  const selectedOutputId = ref('')
  const inputVolume = ref(100)
  const outputVolume = ref(100)

  const inputDevices = computed(() => devices.value.filter((d) => d.kind === 'audioinput'))
  const outputDevices = computed(() => devices.value.filter((d) => d.kind === 'audiooutput'))

  const refreshDevices = async (): Promise<void> => {
    const all = await navigator.mediaDevices.enumerateDevices()
    devices.value = all.filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')

    if (!selectedInputId.value && inputDevices.value[0]) {
      selectedInputId.value = inputDevices.value[0].deviceId
    }
    if (!selectedOutputId.value && outputDevices.value[0]) {
      selectedOutputId.value = outputDevices.value[0].deviceId
    }
  }

  const requestPermission = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      stream.getTracks().forEach((t) => t.stop())
      permission.value = 'granted'
      await refreshDevices()
    } catch {
      permission.value = 'denied'
    }
  }

  const checkPermission = async (): Promise<void> => {
    if (!navigator.permissions) {
      await refreshDevices()
      return
    }
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    permission.value = status.state as PermissionState

    if (status.state === 'granted') await refreshDevices()

    status.addEventListener('change', async () => {
      permission.value = status.state as PermissionState
      if (status.state === 'granted') await refreshDevices()
    })
  }

  watch(selectedOutputId, (deviceId) => {
    if (deviceId) setOutputDevice(deviceId).catch(() => {})
  })

  watch(outputVolume, (v) => setOutputVolume(v))

  return {
    permission,
    inputDevices,
    outputDevices,
    selectedInputId,
    selectedOutputId,
    inputVolume,
    outputVolume,
    requestPermission,
    checkPermission,
    refreshDevices,
  }
}
