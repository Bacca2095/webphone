import { ref } from 'vue'
import { loadContacts, saveContact, deleteContact as deleteContactDB } from '../core/db'
import type { Contact } from '../types'

const contacts = ref<Contact[]>([])

loadContacts().then(c => { contacts.value = c }).catch(() => {})

const addContact = (contact: Omit<Contact, 'id'>): void => {
  const c: Contact = { ...contact, id: crypto.randomUUID() }
  contacts.value.push(c)
  saveContact(c).catch(() => {})
}

const updateContact = (updated: Contact): void => {
  const idx = contacts.value.findIndex(c => c.id === updated.id)
  if (idx !== -1) contacts.value[idx] = updated
  saveContact(updated).catch(() => {})
}

const deleteContact = (id: string): void => {
  const idx = contacts.value.findIndex(c => c.id === id)
  if (idx !== -1) contacts.value.splice(idx, 1)
  deleteContactDB(id).catch(() => {})
}

export const useContacts = () => ({
  contacts,
  addContact,
  updateContact,
  deleteContact,
})
