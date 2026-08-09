export type MqttMessageHandler = (payload: unknown, topic: string, raw: string) => void

function wildcardToRegex(topic: string): RegExp {
  // MQTT '#' matches zero or more levels, including the parent.
  // e.g. "sport/tennis/#" must match "sport/tennis" AND "sport/tennis/score".
  if (topic === '#') return /^.*$/

  const segments = topic.split('/')
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // # must be the final segment — handle it separately so the slash
  // before it becomes optional (zero levels = match the parent topic).
  if (segments[segments.length - 1] === '#') {
    const prefix = segments.slice(0, -1).map((seg) => {
      if (seg === '+') return '[^/]+'
      return escapeRegExp(seg)
    }).join('/')
    return new RegExp(`^${prefix}(?:/.*)?$`)
  }

  // No # wildcard — only single-level + wildcards possible.
  const regexStr = segments.map((seg) => {
    if (seg === '+') return '[^/]+'
    return escapeRegExp(seg)
  }).join('/')
  return new RegExp(`^${regexStr}$`)
}

export class MqttRouter {
  private exact = new Map<string, Set<MqttMessageHandler>>()
  private wildcards: Array<{ pattern: RegExp; handler: MqttMessageHandler }> = []

  on(topic: string, handler: MqttMessageHandler): () => void {
    if (topic.includes('#') || topic.includes('+')) {
      const entry = { pattern: wildcardToRegex(topic), handler }
      this.wildcards.push(entry)
      return () => {
        const idx = this.wildcards.indexOf(entry)
        if (idx !== -1) this.wildcards.splice(idx, 1)
      }
    }

    let handlers = this.exact.get(topic)
    if (!handlers) {
      handlers = new Set()
      this.exact.set(topic, handlers)
    }
    handlers.add(handler)
    return () => {
      handlers?.delete(handler)
      if (handlers && handlers.size === 0) this.exact.delete(topic)
    }
  }

  off(topic: string, handler: MqttMessageHandler): void {
    if (topic.includes('#') || topic.includes('+')) {
      this.wildcards = this.wildcards.filter(
        (w) => w.handler !== handler
      )
      return
    }

    const handlers = this.exact.get(topic)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) this.exact.delete(topic)
    }
  }

  dispatch(topic: string, raw: string | Buffer): boolean {
    const rawStr = typeof raw === 'string' ? raw : raw.toString()
    let payload: unknown = rawStr
    try {
      payload = JSON.parse(rawStr)
    } catch {
      // non-JSON payload, keep as string
    }

    let matched = false

    const exactHandlers = this.exact.get(topic)
    if (exactHandlers) {
      exactHandlers.forEach((h) => h(payload, topic, rawStr))
      matched = true
    }

    for (const { pattern, handler } of this.wildcards) {
      if (pattern.test(topic)) {
        handler(payload, topic, rawStr)
        matched = true
      }
    }

    return matched
  }

  clear(): void {
    this.exact.clear()
    this.wildcards.length = 0
  }
}
