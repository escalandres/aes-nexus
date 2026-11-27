import { z } from 'zod'
import type { PaginationQuery } from '../types/common.ts'

export const externalReferenceInputSchema = z.object({
  externalId: z.string().trim().min(1).max(120).nullable().optional(),
  externalSource: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Solo minúsculas, números, guion, punto o guion bajo.')
    .nullable()
    .optional(),
})

export function parsePaginationQuery(rawQuery: Record<string, unknown>): PaginationQuery {
  const page = Math.max(1, Number(rawQuery.page || 1) || 1)
  const rawSize = Number(rawQuery.pageSize || 25) || 25
  const pageSize = Math.min(200, Math.max(1, rawSize))
  const sortBy = typeof rawQuery.sortBy === 'string' && rawQuery.sortBy.trim() ? rawQuery.sortBy.trim() : 'updatedAt'
  const sortDir = rawQuery.sortDir === 'asc' ? 'asc' : 'desc'
  const search = typeof rawQuery.search === 'string' ? rawQuery.search.trim() : ''
  const externalSource =
    typeof rawQuery.externalSource === 'string' && rawQuery.externalSource.trim()
      ? rawQuery.externalSource.trim().toLowerCase()
      : undefined
  const externalId =
    typeof rawQuery.externalId === 'string' && rawQuery.externalId.trim()
      ? rawQuery.externalId.trim()
      : undefined
  const includeDeleted = rawQuery.includeDeleted === 'true' || rawQuery.includeDeleted === true

  return {
    page,
    pageSize,
    sortBy,
    sortDir,
    search,
    externalSource,
    externalId,
    includeDeleted,
  }
}
