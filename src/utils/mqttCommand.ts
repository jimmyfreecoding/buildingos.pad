import { publish, onMessage } from './mqtt'

interface PendingCommand {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const pending = new Map<string, PendingCommand>()

let correlationCounter = 0

export function sendCommand(
  topic: string,
  payload: Record<string, unknown>,
  responseTopic: string,
  { timeoutMs = 10_000 }: { timeoutMs?: number } = {}
): Promise<unknown> {
  const correlationId = `cmd_${Date.now()}_${++correlationCounter}`
  const data = { ...payload, correlationId }

  const unsubscribe = onMessage(responseTopic, (parsed, _topic) => {
    const msg = parsed as Record<string, unknown>
    if (msg.correlationId === correlationId) {
      const entry = pending.get(correlationId)
      if (entry) {
        clearTimeout(entry.timeout)
        pending.delete(correlationId)
        unsubscribe()
        entry.resolve(msg)
      }
    }
  })

  const promise = new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(correlationId)
      unsubscribe()
      reject(new Error(`Command timeout for ${topic}`))
    }, timeoutMs)

    pending.set(correlationId, { resolve, reject, timeout })
  })

  publish(topic, data)
  return promise
}
