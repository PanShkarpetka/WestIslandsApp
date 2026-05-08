/**
 * In-memory Firestore mock that mirrors the firebase/firestore function API.
 *
 * Usage:
 *   const mock = createMockFirestore({ 'collection/docId': { field: value } })
 *   // Pass mock.firebase and mock.db to the function under test
 *   await someService(options, { db: mock.db, ...mock.firebase })
 *   // Inspect results
 *   mock.get('collection/docId')           // single doc data or undefined
 *   mock.list('collection')                // { id: data } map of all docs in collection
 *   mock.listIds('collection')             // array of doc ids
 */
export function createMockFirestore(seed = {}) {
  const store = new Map(Object.entries(seed))

  const TIMESTAMP_SENTINEL = Symbol('serverTimestamp')

  function autoId() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  }

  function resolveTimestamps(data) {
    if (!data || typeof data !== 'object') return data
    const out = {}
    for (const [k, v] of Object.entries(data)) {
      out[k] = v === TIMESTAMP_SENTINEL ? '__serverTimestamp__' : v
    }
    return out
  }

  function pathOf(ref) {
    return ref.__path
  }

  function makeDocRef(path) {
    return { __path: path, __type: 'doc', id: path.split('/').at(-1) }
  }

  function makeColRef(path) {
    return { __path: path, __type: 'collection' }
  }

  // Mirrors: collection(db, 'col') or collection(docRef, 'col') or collection(db, 'col', 'id', 'subcol')
  function collection(dbOrRef, ...segments) {
    if (dbOrRef?.__type === 'doc') {
      return makeColRef(`${dbOrRef.__path}/${segments.join('/')}`)
    }
    return makeColRef(segments.join('/'))
  }

  // Mirrors: doc(db, 'col', 'id'), doc(db, 'col/id'), doc(colRef), doc(colRef, 'id')
  function doc(dbOrRef, ...segments) {
    if (dbOrRef?.__type === 'collection') {
      const id = segments[0] || autoId()
      return makeDocRef(`${dbOrRef.__path}/${id}`)
    }
    // doc(db, ...segments) — join all segments
    const path = segments.join('/')
    return makeDocRef(path)
  }

  // Mirrors: getDoc(docRef)
  async function getDoc(ref) {
    const data = store.get(pathOf(ref))
    const exists = data !== undefined
    return {
      exists: () => exists,
      data: () => (exists ? { ...data } : undefined),
      ref,
      id: ref.id,
    }
  }

  // Mirrors: getDocs(query)
  async function getDocs(queryObj) {
    const colPath = queryObj.__colPath || queryObj.__path
    const constraints = queryObj.__constraints || []

    const prefix = colPath + '/'
    let docs = []
    for (const [path, data] of store.entries()) {
      if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
        docs.push({ id: path.slice(prefix.length), __path: path, data: () => ({ ...data }), ref: makeDocRef(path) })
      }
    }

    // Apply where constraints
    for (const c of constraints) {
      if (c.__type !== 'where') continue
      docs = docs.filter((d) => {
        const val = c.field === '__documentId__' ? d.id : d.data()[c.field]
        if (c.op === '==') {
          if (val?.__path !== undefined && c.value?.__path !== undefined) return val.__path === c.value.__path
          return val === c.value
        }
        if (c.op === '!=') return val !== c.value
        if (c.op === 'in') return Array.isArray(c.value) && c.value.includes(val)
        if (c.op === 'not-in') return Array.isArray(c.value) && !c.value.includes(val)
        if (c.op === '>') return val > c.value
        if (c.op === '>=') return val >= c.value
        if (c.op === '<') return val < c.value
        if (c.op === '<=') return val <= c.value
        return true
      })
    }

    // Apply orderBy
    for (const c of constraints) {
      if (c.__type !== 'orderBy') continue
      docs.sort((a, b) => {
        const va = a.data()[c.field]
        const vb = b.data()[c.field]
        const dir = c.direction === 'desc' ? -1 : 1
        if (va == null && vb == null) return 0
        if (va == null) return dir
        if (vb == null) return -dir
        return (va < vb ? -1 : va > vb ? 1 : 0) * dir
      })
    }

    // Apply startAfter
    for (const c of constraints) {
      if (c.__type !== 'startAfter') continue
      const idx = docs.findIndex((d) => d.__path === c.cursor?.__path)
      if (idx !== -1) docs = docs.slice(idx + 1)
    }

    // Apply limit
    for (const c of constraints) {
      if (c.__type !== 'limit') continue
      docs = docs.slice(0, c.n)
    }

    return { docs, empty: docs.length === 0, size: docs.length }
  }

  // Mirrors: addDoc(colRef, data)
  async function addDoc(colRef, data) {
    const id = autoId()
    const path = `${pathOf(colRef)}/${id}`
    store.set(path, resolveTimestamps(data))
    return makeDocRef(path)
  }

  // Mirrors: setDoc(ref, data) / setDoc(ref, data, { merge: true })
  async function setDoc(ref, data, options = {}) {
    const path = pathOf(ref)
    if (options.merge && store.has(path)) {
      store.set(path, { ...store.get(path), ...resolveTimestamps(data) })
    } else {
      store.set(path, resolveTimestamps(data))
    }
  }

  // Mirrors: updateDoc(ref, data)
  async function updateDoc(ref, data) {
    const path = pathOf(ref)
    store.set(path, { ...(store.get(path) || {}), ...resolveTimestamps(data) })
  }

  // Mirrors: deleteDoc(ref)
  async function deleteDoc(ref) {
    store.delete(pathOf(ref))
  }

  // Mirrors: runTransaction(db, fn)
  async function runTransaction(_db, fn) {
    const ops = []
    const t = {
      async get(ref) { return getDoc(ref) },
      set(ref, data, options = {}) { ops.push({ type: 'set', ref, data, options }) },
      update(ref, data) { ops.push({ type: 'update', ref, data }) },
      delete(ref) { ops.push({ type: 'delete', ref }) },
    }
    const result = await fn(t)
    for (const op of ops) {
      if (op.type === 'set') await setDoc(op.ref, op.data, op.options)
      if (op.type === 'update') await updateDoc(op.ref, op.data)
      if (op.type === 'delete') await deleteDoc(op.ref)
    }
    return result
  }

  // Mirrors: writeBatch(db)
  function writeBatch() {
    const ops = []
    return {
      set(ref, data, options = {}) { ops.push({ type: 'set', ref, data, options }) },
      update(ref, data) { ops.push({ type: 'update', ref, data }) },
      delete(ref) { ops.push({ type: 'delete', ref }) },
      async commit() {
        for (const op of ops) {
          if (op.type === 'set') await setDoc(op.ref, op.data, op.options)
          if (op.type === 'update') await updateDoc(op.ref, op.data)
          if (op.type === 'delete') await deleteDoc(op.ref)
        }
      },
    }
  }

  // Mirrors: query(colRef, ...constraints)
  function query(colRef, ...constraints) {
    return { __colPath: pathOf(colRef), __constraints: constraints }
  }

  // Mirrors: where(field, op, value)
  function where(field, op, value) {
    return { __type: 'where', field: pathOf(field) ?? field, op, value }
  }

  // Mirrors: orderBy(field, direction?)
  function orderBy(field, direction = 'asc') {
    return { __type: 'orderBy', field, direction }
  }

  // Mirrors: limit(n)
  function limit(n) {
    return { __type: 'limit', n }
  }

  // Mirrors: startAfter(docSnap)
  function startAfter(cursor) {
    return { __type: 'startAfter', cursor }
  }

  // Mirrors: documentId()
  function documentId() {
    return { __path: '__documentId__' }
  }

  // Mirrors: serverTimestamp()
  function serverTimestamp() {
    return TIMESTAMP_SENTINEL
  }

  const db = { __isMockDb: true }

  const firebase = {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    runTransaction,
    writeBatch,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    documentId,
    serverTimestamp,
  }

  return {
    db,
    firebase,
    // Inspection helpers for assertions
    get: (path) => store.get(path),
    list: (colPath) => {
      const prefix = colPath + '/'
      const result = {}
      for (const [path, data] of store.entries()) {
        if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
          result[path.slice(prefix.length)] = data
        }
      }
      return result
    },
    listIds: (colPath) => Object.keys(
      (() => {
        const prefix = colPath + '/'
        const ids = []
        for (const path of store.keys()) {
          if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) ids.push(path.slice(prefix.length))
        }
        return ids
      })()
    ),
    store,
  }
}
