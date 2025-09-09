function simpleUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const KEY = "anon_user_id"

export function ensureUserId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = simpleUuid()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function getUserId(): string {
  if (typeof window === "undefined") return ""
  return ensureUserId()
}
