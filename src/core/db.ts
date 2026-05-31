import type { CallRecord, PhoneNote, Contact, ScheduledCall } from '../types'

const DB_NAME = 'webphone'
const DB_VERSION = 4
const HISTORY_STORE = 'call-history'
const NOTES_STORE = 'phone-notes'
const CONTACTS_STORE = 'contacts'
const SCHEDULE_STORE = 'scheduled-calls'

export const MAX_HISTORY = 50

let _db: Promise<IDBDatabase> | null = null

const openDB = (): Promise<IDBDatabase> => {
  if (_db) return _db
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(HISTORY_STORE))
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: 'id' })
        store.createIndex('remoteUri', 'remoteUri', { unique: false })
      }
      if (!db.objectStoreNames.contains(CONTACTS_STORE))
        db.createObjectStore(CONTACTS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(SCHEDULE_STORE))
        db.createObjectStore(SCHEDULE_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { _db = null; reject(req.error) }
    req.onblocked = () => { _db = null; reject(new Error('IndexedDB upgrade blocked')) }
  })
  return _db
}

const wrap = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

// --- Call history ---

type RawRecord = Omit<CallRecord, 'endedAt'> & { endedAt: string }

export const loadHistory = async (): Promise<CallRecord[]> => {
  const db = await openDB()
  const tx = db.transaction(HISTORY_STORE, 'readonly')
  const raw = await wrap(tx.objectStore(HISTORY_STORE).getAll()) as RawRecord[]
  const sorted = raw
    .map(r => ({ ...r, endedAt: new Date(r.endedAt) }))
    .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())

  if (sorted.length > MAX_HISTORY) {
    const pruneTx = db.transaction(HISTORY_STORE, 'readwrite')
    const pruneStore = pruneTx.objectStore(HISTORY_STORE)
    await Promise.all(sorted.slice(MAX_HISTORY).map(r => wrap(pruneStore.delete(r.id))))
  }

  return sorted.slice(0, MAX_HISTORY)
}

export const saveRecord = async (record: CallRecord): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(HISTORY_STORE, 'readwrite')
  await wrap(tx.objectStore(HISTORY_STORE).put({ ...record, endedAt: record.endedAt.toISOString() }))
}

// --- Phone notes ---

type RawNote = Omit<PhoneNote, 'createdAt'> & { createdAt: string }

export const loadNotes = async (): Promise<PhoneNote[]> => {
  const db = await openDB()
  const tx = db.transaction(NOTES_STORE, 'readonly')
  const raw = await wrap(tx.objectStore(NOTES_STORE).getAll()) as RawNote[]
  return raw
    .map(n => ({ ...n, createdAt: new Date(n.createdAt) }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const saveNote = async (note: PhoneNote): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(NOTES_STORE, 'readwrite')
  await wrap(tx.objectStore(NOTES_STORE).put({ ...note, createdAt: note.createdAt.toISOString() }))
}

export const deleteNote = async (id: string): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(NOTES_STORE, 'readwrite')
  await wrap(tx.objectStore(NOTES_STORE).delete(id))
}

// --- Contacts ---

export const loadContacts = async (): Promise<Contact[]> => {
  const db = await openDB()
  const tx = db.transaction(CONTACTS_STORE, 'readonly')
  return wrap(tx.objectStore(CONTACTS_STORE).getAll())
}

export const saveContact = async (contact: Contact): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(CONTACTS_STORE, 'readwrite')
  await wrap(tx.objectStore(CONTACTS_STORE).put(contact))
}

export const deleteContact = async (id: string): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(CONTACTS_STORE, 'readwrite')
  await wrap(tx.objectStore(CONTACTS_STORE).delete(id))
}

// --- Scheduled calls ---

type RawScheduled = Omit<ScheduledCall, 'scheduledAt'> & { scheduledAt: string }

export const loadScheduledCalls = async (): Promise<ScheduledCall[]> => {
  const db = await openDB()
  const tx = db.transaction(SCHEDULE_STORE, 'readonly')
  const raw = await wrap(tx.objectStore(SCHEDULE_STORE).getAll()) as RawScheduled[]
  return raw
    .map(s => ({ ...s, scheduledAt: new Date(s.scheduledAt) }))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

export const saveScheduledCall = async (s: ScheduledCall): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(SCHEDULE_STORE, 'readwrite')
  await wrap(tx.objectStore(SCHEDULE_STORE).put({ ...s, scheduledAt: s.scheduledAt.toISOString() }))
}

export const deleteScheduledCall = async (id: string): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(SCHEDULE_STORE, 'readwrite')
  await wrap(tx.objectStore(SCHEDULE_STORE).delete(id))
}
