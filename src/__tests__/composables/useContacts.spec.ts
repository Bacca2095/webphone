import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContacts } from '../../composables/useContacts'
import type { Contact } from '../../types'

vi.mock('../../core/db', () => ({
  loadContacts: vi.fn(() => Promise.resolve([])),
  saveContact: vi.fn(() => Promise.resolve()),
  deleteContact: vi.fn(() => Promise.resolve()),
}))

describe('useContacts', () => {
  beforeEach(() => {
    // Reset module-level singleton state between tests
    useContacts().contacts.value = []
  })

  describe('addContact', () => {
    it('adds the contact to the list', () => {
      // Arrange
      const { contacts, addContact } = useContacts()

      // Act
      addContact({ name: 'Alice', phone: '1001' })

      // Assert
      expect(contacts.value).toHaveLength(1)
      expect(contacts.value[0].name).toBe('Alice')
      expect(contacts.value[0].phone).toBe('1001')
    })

    it('generates a unique id for each contact', () => {
      // Arrange
      const { contacts, addContact } = useContacts()

      // Act
      addContact({ name: 'Alice', phone: '1001' })
      addContact({ name: 'Bob', phone: '1002' })

      // Assert
      const [first, second] = contacts.value
      expect(first.id).toBeTruthy()
      expect(second.id).toBeTruthy()
      expect(first.id).not.toBe(second.id)
    })

    it('preserves all provided fields', () => {
      // Arrange
      const { contacts, addContact } = useContacts()

      // Act
      addContact({ name: 'Bob', phone: 'sip:bob@domain.com', type: 'external' })

      // Assert
      const contact = contacts.value[0]
      expect(contact.name).toBe('Bob')
      expect(contact.phone).toBe('sip:bob@domain.com')
      expect(contact.type).toBe('external')
    })
  })

  describe('updateContact', () => {
    it('replaces the contact fields by id', () => {
      // Arrange
      const { contacts, addContact, updateContact } = useContacts()
      addContact({ name: 'Alice', phone: '1001' })
      const updated: Contact = { ...contacts.value[0], name: 'Alice Updated', phone: '9999' }

      // Act
      updateContact(updated)

      // Assert
      expect(contacts.value[0].name).toBe('Alice Updated')
      expect(contacts.value[0].phone).toBe('9999')
    })

    it('does not affect other contacts in the list', () => {
      // Arrange
      const { contacts, addContact, updateContact } = useContacts()
      addContact({ name: 'Alice', phone: '1001' })
      addContact({ name: 'Bob', phone: '1002' })
      const updatedAlice: Contact = { ...contacts.value[0], name: 'Alice Updated' }

      // Act
      updateContact(updatedAlice)

      // Assert
      expect(contacts.value[1].name).toBe('Bob')
    })

    it('does nothing when the id does not exist', () => {
      // Arrange
      const { contacts, addContact, updateContact } = useContacts()
      addContact({ name: 'Alice', phone: '1001' })
      const ghost: Contact = { id: 'ghost-id', name: 'Ghost', phone: '0000' }

      // Act
      updateContact(ghost)

      // Assert
      expect(contacts.value).toHaveLength(1)
      expect(contacts.value[0].name).toBe('Alice')
    })
  })

  describe('deleteContact', () => {
    it('removes the contact with the matching id', () => {
      // Arrange
      const { contacts, addContact, deleteContact } = useContacts()
      addContact({ name: 'Alice', phone: '1001' })
      const id = contacts.value[0].id

      // Act
      deleteContact(id)

      // Assert
      expect(contacts.value).toHaveLength(0)
    })

    it('only removes the targeted contact, leaving others intact', () => {
      // Arrange
      const { contacts, addContact, deleteContact } = useContacts()
      addContact({ name: 'Alice', phone: '1001' })
      addContact({ name: 'Bob', phone: '1002' })
      const aliceId = contacts.value[0].id

      // Act
      deleteContact(aliceId)

      // Assert
      expect(contacts.value).toHaveLength(1)
      expect(contacts.value[0].name).toBe('Bob')
    })

    it('does nothing when the id does not exist', () => {
      // Arrange
      const { contacts, addContact, deleteContact } = useContacts()
      addContact({ name: 'Alice', phone: '1001' })

      // Act
      deleteContact('ghost-id')

      // Assert
      expect(contacts.value).toHaveLength(1)
    })
  })
})
