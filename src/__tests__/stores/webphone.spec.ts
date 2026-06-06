import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWebPhoneStore } from '../../stores/webphone'
import type { CallInfo } from '../../types'

vi.mock('../../core/db', () => ({
  loadHistory: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
  saveRecord: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  loadNotes: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
  saveNote: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  deleteNote: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  loadScheduledCalls: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
  saveScheduledCall: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  deleteScheduledCall: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  MAX_HISTORY: 50,
}))

const mockHold = vi.fn<() => void>()
vi.mock('../../core/sip', () => ({
  getSession: vi.fn<() => { hold: () => void }>(() => ({ hold: mockHold })),
}))

const makeChannel = (overrides: Partial<CallInfo> = {}): CallInfo => ({
  id: crypto.randomUUID(),
  direction: 'outgoing',
  status: 'connecting',
  remoteUri: 'sip:alice@domain.com',
  remoteName: 'Alice',
  startTime: null,
  duration: 0,
  isMuted: false,
  ...overrides,
})

describe('useWebPhoneStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockHold.mockClear()
  })

  describe('addChannel', () => {
    it('adds the channel and returns true when under the limit', () => {
      // Arrange
      const store = useWebPhoneStore()
      const channel = makeChannel({ status: 'ringing' })

      // Act
      const result = store.addChannel(channel)

      // Assert
      expect(result).toBe(true)
      expect(store.channels).toHaveLength(1)
      expect(store.channels[0].id).toBe(channel.id)
    })

    it('returns false and does not add when at MAX_CHANNELS (3)', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.addChannel(makeChannel({ id: '1' }))
      store.addChannel(makeChannel({ id: '2' }))
      store.addChannel(makeChannel({ id: '3' }))
      const overflow = makeChannel({ id: '4' })

      // Act
      const result = store.addChannel(overflow)

      // Assert
      expect(result).toBe(false)
      expect(store.channels).toHaveLength(3)
    })

    it('holds other active channels when the new channel is active', () => {
      // Arrange
      const store = useWebPhoneStore()
      const existing = makeChannel({ id: '1', status: 'active' })
      store.channels.push(existing)
      const incoming = makeChannel({ id: '2', status: 'active' })

      // Act
      store.addChannel(incoming)

      // Assert
      expect(mockHold).toHaveBeenCalledOnce()
      expect(store.channels.find((c) => c.id === '1')?.status).toBe('held')
    })
  })

  describe('updateStatus', () => {
    it('updates the status of the target channel', () => {
      // Arrange
      const store = useWebPhoneStore()
      const channel = makeChannel({ id: '1', status: 'connecting' })
      store.channels.push(channel)

      // Act
      store.updateStatus('1', 'active')

      // Assert
      expect(store.channels[0].status).toBe('active')
    })

    it('holds other active channels when a channel becomes active', () => {
      // Arrange
      const store = useWebPhoneStore()
      const active = makeChannel({ id: '1', status: 'active' })
      const connecting = makeChannel({ id: '2', status: 'connecting' })
      store.channels.push(active, connecting)

      // Act
      store.updateStatus('2', 'active')

      // Assert
      expect(store.channels.find((c) => c.id === '1')?.status).toBe('held')
    })

    it('does not affect channels that are already held', () => {
      // Arrange
      const store = useWebPhoneStore()
      const held = makeChannel({ id: '1', status: 'held' })
      const connecting = makeChannel({ id: '2', status: 'connecting' })
      store.channels.push(held, connecting)

      // Act
      store.updateStatus('2', 'active')

      // Assert — held channel is not touched, mockHold not called
      expect(mockHold).not.toHaveBeenCalled()
      expect(store.channels.find((c) => c.id === '1')?.status).toBe('held')
    })
  })

  describe('updateMute', () => {
    it('mutes a channel', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', isMuted: false }))

      // Act
      store.updateMute('1', true)

      // Assert
      expect(store.channels[0].isMuted).toBe(true)
    })

    it('unmutes a channel', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', isMuted: true }))

      // Act
      store.updateMute('1', false)

      // Assert
      expect(store.channels[0].isMuted).toBe(false)
    })
  })

  describe('removeChannel', () => {
    it('removes the channel from the list', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', startTime: new Date() }))

      // Act
      store.removeChannel('1')

      // Assert
      expect(store.channels).toHaveLength(0)
    })

    it('records outcome as "answered" when the call had a startTime', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', direction: 'outgoing', startTime: new Date() }))

      // Act
      store.removeChannel('1')

      // Assert
      expect(store.history[0].outcome).toBe('answered')
    })

    it('records outcome as "missed" for an incoming call with no startTime', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', direction: 'incoming', startTime: null }))

      // Act
      store.removeChannel('1')

      // Assert
      expect(store.history[0].outcome).toBe('missed')
    })

    it('records outcome as "failed" for an outgoing call with no startTime', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', direction: 'outgoing', startTime: null }))

      // Act
      store.removeChannel('1')

      // Assert
      expect(store.history[0].outcome).toBe('failed')
    })

    it('preserves remoteUri and direction in the history record', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(
        makeChannel({
          id: '1',
          direction: 'incoming',
          remoteUri: 'sip:bob@domain.com',
          startTime: new Date(),
        }),
      )

      // Act
      store.removeChannel('1')

      // Assert
      expect(store.history[0].remoteUri).toBe('sip:bob@domain.com')
      expect(store.history[0].direction).toBe('incoming')
    })

    it('does not throw when removing a non-existent id', () => {
      // Arrange
      const store = useWebPhoneStore()

      // Act & Assert
      expect(() => store.removeChannel('ghost-id')).not.toThrow()
    })
  })

  describe('startTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('sets startTime on the channel', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', startTime: null }))

      // Act
      store.startTimer('1')

      // Assert
      expect(store.channels[0].startTime).toBeInstanceOf(Date)
    })

    it('increments duration by 1 each second', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', startTime: null }))
      store.startTimer('1')

      // Act
      vi.advanceTimersByTime(3000)

      // Assert
      expect(store.channels[0].duration).toBe(3)
    })
  })

  describe('addNote / removeNote', () => {
    it('prepends a note to the list', () => {
      // Arrange
      const store = useWebPhoneStore()

      // Act
      store.addNote('sip:alice@domain.com', 'Alice', 'Call about the project')

      // Assert
      expect(store.notes).toHaveLength(1)
      expect(store.notes[0].text).toBe('Call about the project')
      expect(store.notes[0].remoteUri).toBe('sip:alice@domain.com')
    })

    it('trims whitespace from the note text', () => {
      // Arrange
      const store = useWebPhoneStore()

      // Act
      store.addNote('sip:alice@domain.com', 'Alice', '  trimmed  ')

      // Assert
      expect(store.notes[0].text).toBe('trimmed')
    })

    it('removes a note by id', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.addNote('sip:alice@domain.com', 'Alice', 'To be removed')
      const id = store.notes[0].id

      // Act
      store.removeNote(id)

      // Assert
      expect(store.notes).toHaveLength(0)
    })

    it('does not remove other notes when the id does not match', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.addNote('sip:alice@domain.com', 'Alice', 'Stays')

      // Act
      store.removeNote('ghost-id')

      // Assert
      expect(store.notes).toHaveLength(1)
    })
  })

  describe('addScheduledCall / removeScheduledCall', () => {
    it('keeps scheduled calls sorted ascending by scheduledAt', () => {
      // Arrange
      const store = useWebPhoneStore()
      const later = new Date('2026-06-10T12:00:00')
      const earlier = new Date('2026-06-08T09:00:00')

      // Act
      store.addScheduledCall({ remoteUri: 'sip:a@domain.com', scheduledAt: later })
      store.addScheduledCall({ remoteUri: 'sip:b@domain.com', scheduledAt: earlier })

      // Assert
      expect(store.scheduledCalls[0].scheduledAt).toEqual(earlier)
      expect(store.scheduledCalls[1].scheduledAt).toEqual(later)
    })

    it('removes a scheduled call by id', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.addScheduledCall({ remoteUri: 'sip:a@domain.com', scheduledAt: new Date() })
      const id = store.scheduledCalls[0].id

      // Act
      store.removeScheduledCall(id)

      // Assert
      expect(store.scheduledCalls).toHaveLength(0)
    })
  })

  describe('computed: incomingChannels', () => {
    it('returns only channels with status "ringing"', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(
        makeChannel({ id: '1', status: 'ringing' }),
        makeChannel({ id: '2', status: 'active' }),
        makeChannel({ id: '3', status: 'ringing' }),
      )

      // Assert
      expect(store.incomingChannels).toHaveLength(2)
      expect(store.incomingChannels.every((c) => c.status === 'ringing')).toBe(true)
    })

    it('returns an empty array when no channel is ringing', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(makeChannel({ id: '1', status: 'active' }))

      // Assert
      expect(store.incomingChannels).toHaveLength(0)
    })
  })

  describe('computed: activeChannels', () => {
    it('includes channels with status active, held, and remote_held', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.channels.push(
        makeChannel({ id: '1', status: 'active' }),
        makeChannel({ id: '2', status: 'held' }),
        makeChannel({ id: '3', status: 'remote_held' }),
        makeChannel({ id: '4', status: 'ringing' }),
        makeChannel({ id: '5', status: 'connecting' }),
      )

      // Assert
      expect(store.activeChannels).toHaveLength(3)
    })
  })

  describe('computed: lastDialed', () => {
    it('returns the remoteUri of the first outgoing record in history', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.history.push(
        {
          id: '1',
          direction: 'outgoing',
          remoteUri: 'sip:alice@domain.com',
          remoteName: 'Alice',
          duration: 60,
          outcome: 'answered',
          endedAt: new Date(),
        },
        {
          id: '2',
          direction: 'incoming',
          remoteUri: 'sip:bob@domain.com',
          remoteName: 'Bob',
          duration: 30,
          outcome: 'answered',
          endedAt: new Date(),
        },
      )

      // Assert
      expect(store.lastDialed).toBe('sip:alice@domain.com')
    })

    it('returns null when there are no outgoing calls', () => {
      // Arrange
      const store = useWebPhoneStore()

      // Assert
      expect(store.lastDialed).toBeNull()
    })

    it('returns null when history only has incoming calls', () => {
      // Arrange
      const store = useWebPhoneStore()
      store.history.push({
        id: '1',
        direction: 'incoming',
        remoteUri: 'sip:bob@domain.com',
        remoteName: 'Bob',
        duration: 0,
        outcome: 'missed',
        endedAt: new Date(),
      })

      // Assert
      expect(store.lastDialed).toBeNull()
    })
  })
})
