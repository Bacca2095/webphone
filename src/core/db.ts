import type { CallRecord } from '../types'

const DB_NAME = 'webphone'
const DB_VERSION = 1
const STORE = 'call-history'

export const MAX_HISTORY = 50

let _db: Promise<IDBDatabase> | null = null

const openDB = (): Promise<IDBDatabase> => {
  if (_db) return _db
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { _db = null; reject(req.error) }
    req.onblocked = () => { _db = null; reject(new Error('IndexedDB upgrade blocked by another tab')) }
  })
  return _db
}

const wrap = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

type RawRecord = Omit<CallRecord, 'endedAt'> & { endedAt: string }

export const loadHistory = async (): Promise<CallRecord[]> => {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readonly')
  const raw = await wrap(tx.objectStore(STORE).getAll()) as RawRecord[]
  const sorted = raw
    .map(record => ({ ...record, endedAt: new Date(record.endedAt) }))
    .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())

  if (sorted.length > MAX_HISTORY) {
    const pruneTx = db.transaction(STORE, 'readwrite')
    const pruneStore = pruneTx.objectStore(STORE)
    await Promise.all(sorted.slice(MAX_HISTORY).map(record => wrap(pruneStore.delete(record.id))))
  }

  return sorted.slice(0, MAX_HISTORY)
}

export const saveRecord = async (record: CallRecord): Promise<void> => {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readwrite')
  await wrap(tx.objectStore(STORE).put({ ...record, endedAt: record.endedAt.toISOString() }))
}
