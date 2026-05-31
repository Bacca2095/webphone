export type CallDirection = 'incoming' | 'outgoing'

export type CallOutcome = 'answered' | 'missed' | 'failed'

export interface CallRecord {
  id: string
  direction: CallDirection
  remoteUri: string
  remoteName: string
  duration: number
  outcome: CallOutcome
  endedAt: Date
}

export type CallStatus =
  | 'ringing'      // incoming, awaiting answer
  | 'connecting'   // outgoing, awaiting remote answer
  | 'active'
  | 'held'         // we put it on hold
  | 'remote_held'  // remote party put us on hold
  | 'ended'
  | 'failed'

export interface CallInfo {
  id: string
  direction: CallDirection
  status: CallStatus
  remoteUri: string
  remoteName: string
  startTime: Date | null
  duration: number // seconds, updated each second while active
  isMuted: boolean
}

export type NoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple'

export interface PhoneNote {
  id: string
  remoteUri: string
  remoteName: string
  text: string
  color?: NoteColor
  createdAt: Date
}

export type ContactType = 'internal' | 'external' | 'service' | 'emergency'

export interface Contact {
  id: string
  name: string
  phone: string  // extension, phone number, or SIP URI
  type?: ContactType
}

export interface ScheduledCall {
  id: string
  remoteUri: string
  scheduledAt: Date
  note?: string
}

export interface WebPhoneConfig {
  server: string      // wss://sip.domain.com
  uri: string         // sip:user@domain.com
  password: string
  displayName?: string
  iceServers?: RTCIceServer[]
}
