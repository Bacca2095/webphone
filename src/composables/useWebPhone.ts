import { computed } from 'vue'
import type { PeerConnectionEvent, HoldEvent } from 'jssip/lib/RTCSession'
import type { RTCSessionEvent } from 'jssip/lib/UA'
import { createUA, destroyUA, getUA, addSession, getSession, removeSession, attachAudio, detachAudio } from '../core/sip'
import { useWebPhoneStore } from '../stores/webphone'
import type { WebPhoneConfig } from '../types'

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
        remoteUri: session.remote_identity.uri.toString(),
        remoteName: session.remote_identity.display_name ?? '',
        startTime: null,
        duration: 0,
        isMuted: false,
      })

      session.on('peerconnection', (pcEvent: PeerConnectionEvent) => {
        pcEvent.peerconnection.addEventListener('track', (trackEvent: RTCTrackEvent) => {
          if (trackEvent.streams[0]) attachAudio(id, trackEvent.streams[0])
        })
      })

      const onActivated = () => {
        store.channels
          .filter(ch => ch.id !== id && ch.status === 'active')
          .forEach(ch => {
            getSession(ch.id)?.hold()
            store.updateStatus(ch.id, 'held')
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

  const call = (target: string): void => {
    const ua = getUA()
    if (!ua || !store.isRegistered) return
    ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
    })
  }

  const answer = (channelId: string): void => {
    getSession(channelId)?.answer({
      mediaConstraints: { audio: true, video: false },
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

  const sendDTMF = (channelId: string, tone: string): void => {
    getSession(channelId)?.sendDTMF(tone)
  }

  return {
    channels: computed(() => store.channels),
    isRegistered: computed(() => store.isRegistered),
    isConnecting: computed(() => store.isConnecting),
    incomingChannels: computed(() => store.incomingChannels),
    activeChannels: computed(() => store.activeChannels),
    connect,
    disconnect,
    call,
    answer,
    hangup,
    hold,
    resume,
    mute,
    unmute,
    sendDTMF,
  }
}
