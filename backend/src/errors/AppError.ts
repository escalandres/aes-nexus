import type { DomainErrorCode } from '../types/common.ts'

export class AppError extends Error {
  public readonly status: number
  public readonly errorCode: DomainErrorCode
  public readonly details?: Record<string, string[]>

  constructor(
    status: number,
    errorCode: DomainErrorCode,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.errorCode = errorCode
    this.details = details
  }
}
