import crypto from 'node:crypto'

export function sign(payload: string, secret: string) {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`
}
