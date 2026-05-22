import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSession } from '../core/sip'
import type { CallInfo, CallStatus } from '../types'

export const useWebPhoneStore = defineStore('webphone', () => {
  const channels = ref<CallInfo[]>([])
  const isRegistered = ref(false)
  const isConnecting = ref(false)

  const timers = new Map<string, ReturnType<typeof setInterval>>()

  const incomingChannels = computed(() => channels.value.filter((c) => c.status === 'ringing'))
  const activeChannels = computed(() =>
    channels.value.filter((c) => c.status === 'active' || c.status === 'held' || c.status === 'remote_held'),
  )

  const holdOtherActives = (excludeId: string): void => {
    channels.value
      .filter(ch => ch.id !== excludeId && ch.status === 'active')
      .forEach(ch => {
        getSession(ch.id)?.hold()
        ch.status = 'held'
      })
  }

  const MAX_CHANNELS = 3

  const addChannel = (info: CallInfo): boolean => {
    if (channels.value.length >= MAX_CHANNELS) return false
    if (info.status === 'active') holdOtherActives(info.id)
    channels.value.push(info)
    return true
  }

  const updateStatus = (id: string, status: CallStatus): void => {
    if (status === 'active') holdOtherActives(id)
    const ch = channels.value.find((c) => c.id === id)
    if (ch) ch.status = status
  }

  const updateMute = (id: string, isMuted: boolean): void => {
    const ch = channels.value.find((c) => c.id === id)
    if (ch) ch.isMuted = isMuted
  }

  const startTimer = (id: string): void => {
    const ch = channels.value.find((c) => c.id === id)
    if (!ch) return
    ch.startTime = new Date()
    timers.set(
      id,
      setInterval(() => {
        if (ch.startTime) ch.duration = Math.floor((Date.now() - ch.startTime.getTime()) / 1000)
      }, 1000),
    )
  }

  const removeChannel = (id: string): void => {
    const timer = timers.get(id)
    if (timer) {
      clearInterval(timer)
      timers.delete(id)
    }
    const idx = channels.value.findIndex((c) => c.id === id)
    if (idx !== -1) channels.value.splice(idx, 1)
  }

  return {
    channels,
    isRegistered,
    isConnecting,
    incomingChannels,
    activeChannels,
    addChannel,
    updateStatus,
    updateMute,
    startTimer,
    removeChannel,
  }
})
