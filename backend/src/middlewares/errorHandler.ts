import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError.ts'

interface PgErrorLike {
  code?: string
  constraint?: string
}

function isPgError(err: unknown): err is PgErrorLike {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as PgErrorLike).code === 'string'
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const traceId = req.requestId || 'unknown'

  if (err instanceof AppError) {
    res.status(err.status).type('application/problem+json').json({
      type: `https://aes-nexus.local/errors/${err.errorCode}`,
      title: err.errorCode.replace(/_/g, ' '),
      status: err.status,
      detail: err.message,
      instance: req.originalUrl,
      errorCode: err.errorCode,
      traceId,
      ...(err.details ? { errors: err.details } : {}),
    })
    return
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_root'
      if (!fieldErrors[key]) fieldErrors[key] = []
      fieldErrors[key].push(issue.message)
    }

    res.status(422).type('application/problem+json').json({
      type: 'https://aes-nexus.local/errors/VALIDATION_ERROR',
      title: 'VALIDATION ERROR',
      status: 422,
      detail: 'Los datos enviados no cumplen con el esquema esperado.',
      instance: req.originalUrl,
      errorCode: 'VALIDATION_ERROR',
      traceId,
      errors: fieldErrors,
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const targetStr = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target ?? '')
      const isExt = targetStr.includes('external')
      const errorCode = isExt ? 'DUPLICATE_EXTERNAL_ID' : 'DUPLICATE_FOLIO'
      res.status(409).type('application/problem+json').json({
        type: `https://aes-nexus.local/errors/${errorCode}`,
        title: errorCode.replace(/_/g, ' '),
        status: 409,
        detail: isExt
          ? 'Ya existe un registro activo con el mismo identificador externo en esta organización.'
          : 'Ya existe un registro con ese identificador único o código.',
        instance: req.originalUrl,
        errorCode,
        traceId,
      })
      return
    }

    if (err.code === 'P2025') {
      res.status(404).type('application/problem+json').json({
        type: 'https://aes-nexus.local/errors/RESOURCE_NOT_FOUND',
        title: 'RESOURCE NOT FOUND',
        status: 404,
        detail: 'Registro no encontrado.',
        instance: req.originalUrl,
        errorCode: 'RESOURCE_NOT_FOUND',
        traceId,
      })
      return
    }

    if (err.code === 'P2003') {
      res.status(409).type('application/problem+json').json({
        type: 'https://aes-nexus.local/errors/INVALID_STATE_TRANSITION',
        title: 'INVALID STATE TRANSITION',
        status: 409,
        detail: 'Referencia inválida o registro vinculado inexistente.',
        instance: req.originalUrl,
        errorCode: 'INVALID_STATE_TRANSITION',
        traceId,
      })
      return
    }
  }

  if (isPgError(err)) {
    if (err.code === '23505') {
      const isExt = Boolean(err.constraint?.includes('_ext'))
      const errorCode = isExt ? 'DUPLICATE_EXTERNAL_ID' : 'DUPLICATE_FOLIO'
      res.status(409).type('application/problem+json').json({
        type: `https://aes-nexus.local/errors/${errorCode}`,
        title: errorCode.replace(/_/g, ' '),
        status: 409,
        detail: isExt
          ? 'Ya existe un registro activo con el mismo identificador externo en esta organización.'
          : 'Ya existe un registro con ese identificador único o folio.',
        instance: req.originalUrl,
        errorCode,
        traceId,
      })
      return
    }

    if (err.code === '22P02') {
      res.status(422).type('application/problem+json').json({
        type: 'https://aes-nexus.local/errors/VALIDATION_ERROR',
        title: 'VALIDATION ERROR',
        status: 422,
        detail: 'Formato de identificador inválido.',
        instance: req.originalUrl,
        errorCode: 'VALIDATION_ERROR',
        traceId,
      })
      return
    }

    if (err.code === '23503') {
      res.status(409).type('application/problem+json').json({
        type: 'https://aes-nexus.local/errors/INVALID_STATE_TRANSITION',
        title: 'INVALID STATE TRANSITION',
        status: 409,
        detail: 'Referencia inválida o registro vinculado inexistente.',
        instance: req.originalUrl,
        errorCode: 'INVALID_STATE_TRANSITION',
        traceId,
      })
      return
    }
  }

  console.error(`[${traceId}] Unhandled backend error:`, err instanceof Error ? err.message : err)

  res.status(500).type('application/problem+json').json({
    type: 'https://aes-nexus.local/errors/INTERNAL_ERROR',
    title: 'INTERNAL ERROR',
    status: 500,
    detail: 'Ocurrió un error interno procesando la solicitud.',
    instance: req.originalUrl,
    errorCode: 'INTERNAL_ERROR',
    traceId,
  })
}
