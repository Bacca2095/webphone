import { UA, WebSocketInterface } from 'jssip'
import type { RTCSession } from 'jssip/lib/RTCSession'
import type { WebPhoneConfig } from '../types'

let ua: UA | null = null
const sessions = new Map<string, RTCSession>()
const audioElements = new Map<string, HTMLAudioElement>()

export const createUA = (config: WebPhoneConfig): UA => {
  if (ua) {
    ua.stop()
    ua = null
  }

  const socket = new WebSocketInterface(config.server)

  ua = new UA({
    sockets: [socket],
    uri: config.uri,
    password: config.password,
    display_name: config.displayName,
    register: true,
    ...(config.iceServers && { pcConfig: { iceServers: config.iceServers } }),
  })

  return ua
}

export const getUA = (): UA | null => ua

export const destroyUA = (): void => {
  sessions.forEach(session => { try { session.terminate() } catch {} })
  sessions.clear()
  audioElements.forEach((el) => el.remove())
  audioElements.clear()
  ua?.stop()
  ua = null
}

export const addSession = (id: string, session: RTCSession): void => {
  sessions.set(id, session)
}

export const getSession = (id: string): RTCSession | undefined => sessions.get(id)

export const removeSession = (id: string): void => {
  sessions.delete(id)
}

export const attachAudio = (id: string, stream: MediaStream): void => {
  const existing = audioElements.get(id)
  if (existing) {
    if (existing.srcObject !== stream) existing.srcObject = stream
    if (existing.paused) existing.play().catch(() => {})
    return
  }

  const audio = document.createElement('audio')
  audio.autoplay = true
  audio.style.display = 'none'
  document.body.appendChild(audio)
  audio.srcObject = stream
  audio.play().catch((err) => console.warn('[webphone] audio play blocked:', err))
  audioElements.set(id, audio)
}

export const detachAudio = (id: string): void => {
  const audio = audioElements.get(id)
  if (!audio) return
  audio.pause()
  audio.srcObject = null
  audio.remove()
  audioElements.delete(id)
}

type AudioElementWithSink = HTMLAudioElement & { setSinkId?: (deviceId: string) => Promise<void> }

export const setOutputDevice = async (deviceId: string): Promise<void> => {
  for (const audio of audioElements.values()) {
    await (audio as AudioElementWithSink).setSinkId?.(deviceId)
  }
}

export const setOutputVolume = (volume: number): void => {
  const normalized = Math.max(0, Math.min(1, volume / 100))
  for (const audio of audioElements.values()) {
    audio.volume = normalized
  }
}

export const setOutputMuted = (muted: boolean): void => {
  for (const audio of audioElements.values()) {
    audio.muted = muted
  }
}
