import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSession } from '../core/sip'
import { loadHistory, saveRecord, MAX_HISTORY } from '../core/db'
import type { CallInfo, CallStatus, CallRecord, CallOutcome } from '../types'

export const useWebPhoneStore = defineStore('webphone', () => {
  const channels = ref<CallInfo[]>([])
  const isRegistered = ref(false)
  const isConnecting = ref(false)
  const history = ref<CallRecord[]>([])
  loadHistory().then(records => { history.value = records }).catch(() => {})

  const timers = new Map<string, ReturnType<typeof setInterval>>()

  const incomingChannels = computed(() => channels.value.filter(channel => channel.status === 'ringing'))
  const activeChannels = computed(() =>
    channels.value.filter(channel => channel.status === 'active' || channel.status === 'held' || channel.status === 'remote_held'),
  )

  const lastDialed = computed(() =>
    history.value.find(record => record.direction === 'outgoing')?.remoteUri ?? null,
  )

  const addToHistory = (record: CallRecord): void => {
    history.value.unshift(record)
    if (history.value.length > MAX_HISTORY) history.value.length = MAX_HISTORY
    saveRecord(record).catch(() => {})
  }

  const holdOtherActives = (excludeId: string): void => {
    channels.value
      .filter(channel => channel.id !== excludeId && channel.status === 'active')
      .forEach(channel => {
        getSession(channel.id)?.hold()
        channel.status = 'held'
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
    const channel = channels.value.find(channel => channel.id === id)
    if (channel) channel.status = status
  }

  const updateMute = (id: string, isMuted: boolean): void => {
    const channel = channels.value.find(channel => channel.id === id)
    if (channel) channel.isMuted = isMuted
  }

  const updateNotes = (id: string, notes: string): void => {
    const channel = channels.value.find(channel => channel.id === id)
    if (channel) channel.notes = notes
  }

  const startTimer = (id: string): void => {
    const channel = channels.value.find(channel => channel.id === id)
    if (!channel) return
    channel.startTime = new Date()
    timers.set(
      id,
      setInterval(() => {
        if (channel.startTime) channel.duration = Math.floor((Date.now() - channel.startTime.getTime()) / 1000)
      }, 1000),
    )
  }

  const removeChannel = (id: string): void => {
    const timer = timers.get(id)
    if (timer) {
      clearInterval(timer)
      timers.delete(id)
    }
    const channel = channels.value.find(channel => channel.id === id)
    if (channel) {
      let outcome: CallOutcome
      if (channel.startTime !== null) outcome = 'answered'
      else if (channel.direction === 'incoming') outcome = 'missed'
      else outcome = 'failed'
      addToHistory({ id, direction: channel.direction, remoteUri: channel.remoteUri, remoteName: channel.remoteName, duration: channel.duration, outcome, endedAt: new Date(), notes: channel.notes })
    }
    const idx = channels.value.findIndex(channel => channel.id === id)
    if (idx !== -1) channels.value.splice(idx, 1)
  }

  return {
    channels,
    isRegistered,
    isConnecting,
    history,
    lastDialed,
    incomingChannels,
    activeChannels,
    addChannel,
    updateStatus,
    updateMute,
    updateNotes,
    startTimer,
    removeChannel,
  }
})
