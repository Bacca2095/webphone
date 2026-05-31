import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSession } from '../core/sip'
import { loadHistory, saveRecord, MAX_HISTORY, loadNotes, saveNote, deleteNote as deleteNoteDB, loadScheduledCalls, saveScheduledCall, deleteScheduledCall as deleteScheduledCallDB } from '../core/db'
import type { CallInfo, CallStatus, CallRecord, CallOutcome, PhoneNote, NoteColor, ScheduledCall } from '../types'

export const useWebPhoneStore = defineStore('webphone', () => {
  const channels = ref<CallInfo[]>([])
  const isRegistered = ref(false)
  const isConnecting = ref(false)
  const history = ref<CallRecord[]>([])
  const notes = ref<PhoneNote[]>([])
  const scheduledCalls = ref<ScheduledCall[]>([])

  loadHistory().then(records => { history.value = records }).catch(() => {})
  loadNotes().then(loaded => { notes.value = loaded }).catch(() => {})
  loadScheduledCalls().then(loaded => { scheduledCalls.value = loaded }).catch(() => {})

  const timers = new Map<string, ReturnType<typeof setInterval>>()

  const incomingChannels = computed(() => channels.value.filter(ch => ch.status === 'ringing'))
  const activeChannels = computed(() =>
    channels.value.filter(ch => ch.status === 'active' || ch.status === 'held' || ch.status === 'remote_held'),
  )

  const lastDialed = computed(() =>
    history.value.find(r => r.direction === 'outgoing')?.remoteUri ?? null,
  )

  const addToHistory = (record: CallRecord): void => {
    history.value.unshift(record)
    if (history.value.length > MAX_HISTORY) history.value.length = MAX_HISTORY
    saveRecord(record).catch(() => {})
  }

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
    const ch = channels.value.find(c => c.id === id)
    if (ch) ch.status = status
  }

  const updateMute = (id: string, isMuted: boolean): void => {
    const ch = channels.value.find(c => c.id === id)
    if (ch) ch.isMuted = isMuted
  }

  const startTimer = (id: string): void => {
    const ch = channels.value.find(c => c.id === id)
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
    if (timer) { clearInterval(timer); timers.delete(id) }
    const ch = channels.value.find(c => c.id === id)
    if (ch) {
      let outcome: CallOutcome
      if (ch.startTime !== null) outcome = 'answered'
      else if (ch.direction === 'incoming') outcome = 'missed'
      else outcome = 'failed'
      addToHistory({
        id,
        direction: ch.direction,
        remoteUri: ch.remoteUri,
        remoteName: ch.remoteName,
        duration: ch.duration,
        outcome,
        endedAt: new Date(),
      })
    }
    const idx = channels.value.findIndex(c => c.id === id)
    if (idx !== -1) channels.value.splice(idx, 1)
  }

  const addNote = (remoteUri: string, remoteName: string, text: string, color?: NoteColor): void => {
    const note: PhoneNote = {
      id: crypto.randomUUID(),
      remoteUri,
      remoteName,
      text: text.trim(),
      color,
      createdAt: new Date(),
    }
    notes.value.unshift(note)
    saveNote(note).catch(() => {})
  }

  const removeNote = (id: string): void => {
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx !== -1) notes.value.splice(idx, 1)
    deleteNoteDB(id).catch(() => {})
  }

  const addScheduledCall = (data: Omit<ScheduledCall, 'id'>): void => {
    const entry: ScheduledCall = { id: crypto.randomUUID(), ...data }
    scheduledCalls.value.push(entry)
    scheduledCalls.value.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    saveScheduledCall(entry).catch(() => {})
  }

  const removeScheduledCall = (id: string): void => {
    const idx = scheduledCalls.value.findIndex(s => s.id === id)
    if (idx !== -1) scheduledCalls.value.splice(idx, 1)
    deleteScheduledCallDB(id).catch(() => {})
  }

  return {
    channels,
    isRegistered,
    isConnecting,
    history,
    notes,
    lastDialed,
    incomingChannels,
    activeChannels,
    addChannel,
    updateStatus,
    updateMute,
    startTimer,
    removeChannel,
    addNote,
    removeNote,
    scheduledCalls,
    addScheduledCall,
    removeScheduledCall,
  }
})
