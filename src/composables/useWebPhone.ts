import { computed } from 'vue'
import type { PeerConnectionEvent, HoldEvent } from 'jssip/lib/RTCSession'
import type { RTCSessionEvent } from 'jssip/lib/UA'
import { createUA, destroyUA, getUA, addSession, getSession, removeSession, attachAudio, detachAudio } from '../core/sip'
import { useWebPhoneStore } from '../stores/webphone'
import type { WebPhoneConfig } from '../types'

const AUDIO_CONSTRAINTS = { audio: true, video: false } as const

const getAudioStream = async (): Promise<MediaStream | null> => {
  try {
    return await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
  } catch (err) {
    console.warn('[webphone] microphone access denied', err)
    return null
  }
}

export const useWebPhone = () => {
  const store = useWebPhoneStore()

  const connect = (config: WebPhoneConfig): void => {
    const ua = createUA(config)
    store.isConnecting = true

    ua.on('registered', () => {
      store.isRegistered = true
      store.isConnecting = false
    })

    ua.on('unregistered', () => {
      store.isRegistered = false
    })

    ua.on('registrationFailed', () => {
      store.isRegistered = false
      store.isConnecting = false
    })

    ua.on('newRTCSession', (e: RTCSessionEvent) => {
      const { session, originator } = e
      const id = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      addSession(id, session)

      store.addChannel({
        id,
        direction: originator === 'remote' ? 'incoming' : 'outgoing',
        status: originator === 'remote' ? 'ringing' : 'connecting',
        remoteUri: session.remote_identity.uri.user ?? session.remote_identity.uri.toString(),
        remoteName: session.remote_identity.display_name ?? '',
        startTime: null,
        duration: 0,
        isMuted: false,
        notes: '',
      })

      const setupTrackListener = (pc: RTCPeerConnection) => {
        pc.addEventListener('track', (trackEvent: RTCTrackEvent) => {
          const stream = trackEvent.streams[0] ?? new MediaStream([trackEvent.track])
          attachAudio(id, stream)
        })
      }

      // For outgoing calls, peerconnection fires before newRTCSession — use the existing PC directly.
      // For incoming calls, the PC is created on answer() — wait for the peerconnection event.
      if (session.connection) {
        setupTrackListener(session.connection)
      } else {
        session.on('peerconnection', (pcEvent: PeerConnectionEvent) => {
          setupTrackListener(pcEvent.peerconnection)
        })
      }

      // Both 'accepted' and 'confirmed' fire per call — guard so the handler runs only once.
      let activated = false
      const onActivated = () => {
        if (activated) return
        activated = true
        store.channels
          .filter(channel => channel.id !== id && channel.status === 'active')
          .forEach(channel => {
            getSession(channel.id)?.hold()
            store.updateStatus(channel.id, 'held')
          })
        store.updateStatus(id, 'active')
        store.startTimer(id)
      }

      session.on('accepted', onActivated)
      session.on('confirmed', onActivated)

      session.on('hold', (holdEvent: HoldEvent) => {
        store.updateStatus(id, holdEvent.originator === 'local' ? 'held' : 'remote_held')
      })

      session.on('unhold', () => {
        store.updateStatus(id, 'active')
      })

      session.on('muted', () => store.updateMute(id, true))
      session.on('unmuted', () => store.updateMute(id, false))

      session.on('ended', () => {
        detachAudio(id)
        removeSession(id)
        store.removeChannel(id)
      })

      session.on('failed', () => {
        detachAudio(id)
        removeSession(id)
        store.removeChannel(id)
      })
    })

    ua.start()
  }

  const disconnect = (): void => {
    destroyUA()
    store.isRegistered = false
    store.isConnecting = false
  }

  const call = async (target: string): Promise<void> => {
    const ua = getUA()
    if (!ua || !store.isRegistered) return
    const stream = await getAudioStream()
    if (!stream) return
    ua.call(target, {
      mediaConstraints: AUDIO_CONSTRAINTS,
      mediaStream: stream,
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    })
  }

  const answer = async (channelId: string): Promise<void> => {
    const stream = await getAudioStream()
    if (!stream) return
    getSession(channelId)?.answer({
      mediaConstraints: AUDIO_CONSTRAINTS,
      mediaStream: stream,
    })
  }

  const hangup = (channelId: string): void => {
    getSession(channelId)?.terminate()
    if (!getSession(channelId)) store.removeChannel(channelId)
  }

  const hold = (channelId: string): void => {
    getSession(channelId)?.hold()
    store.updateStatus(channelId, 'held')
  }

  const resume = (channelId: string): void => {
    getSession(channelId)?.unhold()
    store.updateStatus(channelId, 'active')
  }

  const mute = (channelId: string): void => {
    getSession(channelId)?.mute({ audio: true, video: false })
    store.updateMute(channelId, true)
  }

  const unmute = (channelId: string): void => {
    getSession(channelId)?.unmute({ audio: true, video: false })
    store.updateMute(channelId, false)
  }

  const updateNotes = (channelId: string, notes: string): void => {
    store.updateNotes(channelId, notes)
  }

  const sendDTMF = (channelId: string, tone: string): void => {
    getSession(channelId)?.sendDTMF(tone)
  }

  return {
    channels: computed(() => store.channels),
    isRegistered: computed(() => store.isRegistered),
    isConnecting: computed(() => store.isConnecting),
    history: computed(() => store.history),
    lastDialed: computed(() => store.lastDialed),
    connect,
    disconnect,
    call,
    answer,
    hangup,
    hold,
    resume,
    mute,
    unmute,
    updateNotes,
    sendDTMF,
  }
}
