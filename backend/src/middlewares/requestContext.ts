import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header('X-Request-Id')?.trim()
  const requestId = incomingId && incomingId.length <= 64 ? incomingId : `req_${crypto.randomUUID()}`
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}
