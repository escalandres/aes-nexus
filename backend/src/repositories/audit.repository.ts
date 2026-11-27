import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import {
  executePaginatedPgQuery,
  isPostgresEnabled,
  queryPg,
  toIsoString,
  toNullableIsoString,
} from '../db/postgres.ts'
import { paginateArray, persistDb, readDb } from '../db/storage.ts'
import type { AuditLogRecord, PaginationQuery } from '../types/common.ts'

interface AuditRow extends QueryResultRow {
  id: string
  organization_id: string
  category: AuditLogRecord['category']
  operation: AuditLogRecord['operation']
  actor_name: string
  entity_type: string
  entity_id: string | null
  summary: string
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
}

const AUDIT_COLUMNS = `
  id, organization_id, category, operation, actor_name, entity_type, entity_id,
  summary, external_id, external_source, external_synced_at, created_at
`

const AUDIT_SORT_MAP: Record<string, string> = {
  category: 'category',
  operation: 'operation',
  actorName: 'actor_name',
  entityType: 'entity_type',
  externalId: 'external_id',
  timestampIso: 'created_at',
  updatedAt: 'created_at',
  createdAt: 'created_at',
}

function mapAuditRow(row: AuditRow): AuditLogRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    category: row.category,
    operation: row.operation,
    actorName: row.actor_name,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    timestampIso: toIsoString(row.created_at),
  }
}

export class AuditRepository {
  async append(entry: Omit<AuditLogRecord, 'id' | 'timestampIso'>): Promise<AuditLogRecord> {
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<AuditRow>(
        `
          INSERT INTO audit_logs (
            id, organization_id, category, operation, actor_name, entity_type, entity_id,
            summary, external_id, external_source, external_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING ${AUDIT_COLUMNS}
        `,
        [
          id,
          entry.organizationId,
          entry.category,
          entry.operation,
          entry.actorName,
          entry.entityType,
          entry.entityId,
          entry.summary,
          entry.externalId ?? null,
          entry.externalSource ?? null,
          entry.externalSyncedAt ?? null,
        ]
      )
      return mapAuditRow(res.rows[0])
    }

    const db = readDb()
    const record: AuditLogRecord = {
      ...entry,
      id: `aud_${crypto.randomUUID()}`,
      timestampIso: new Date().toISOString(),
    }
    db.auditLogs.unshift(record)
    if (db.auditLogs.length > 1000) {
      db.auditLogs = db.auditLogs.slice(0, 1000)
    }
    persistDb(db)
    return record
  }

  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<AuditRow, AuditLogRecord>(
        {
          table: 'audit_logs',
          organizationId,
          query,
          requestId,
          selectColumns: AUDIT_COLUMNS,
          searchColumns: ['actor_name', 'entity_type', 'summary', 'entity_id', 'external_id'],
          sortColumnMap: AUDIT_SORT_MAP,
          defaultSortColumn: 'created_at',
          hasDeletedAt: false,
        },
        mapAuditRow
      )
    }

    const db = readDb()
    const rows = db.auditLogs.filter((a) => a.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      { ...query, sortBy: query.sortBy === 'updatedAt' ? 'timestampIso' : query.sortBy },
      requestId,
      ['actorName', 'entityType', 'summary', 'entityId', 'externalId']
    )
  }
}
