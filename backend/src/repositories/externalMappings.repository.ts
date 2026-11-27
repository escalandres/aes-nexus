import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import { isPostgresEnabled, queryPg, toIsoString } from '../db/postgres.ts'
import { persistDb, readDb } from '../db/storage.ts'
import type { ExternalIdMappingRecord, IntegrableEntityType } from '../types/common.ts'

interface ExternalMappingRow extends QueryResultRow {
  id: string
  organization_id: string
  entity_type: IntegrableEntityType
  entity_id: string
  external_system: string
  external_id: string
  external_url: string | null
  sync_direction: 'inbound' | 'outbound' | 'bidirectional'
  last_synced_at: Date | string
  payload_hash: string | null
  metadata: Record<string, unknown> | null
}

const MAPPING_COLUMNS = `
  id, organization_id, entity_type, entity_id, external_system, external_id,
  external_url, sync_direction, last_synced_at, payload_hash, metadata
`

function mapExternalMappingRow(row: ExternalMappingRow): ExternalIdMappingRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    externalSystem: row.external_system,
    externalId: row.external_id,
    externalUrl: row.external_url,
    syncDirection: row.sync_direction,
    lastSyncedAt: toIsoString(row.last_synced_at),
    payloadHash: row.payload_hash,
    metadata: row.metadata,
  }
}

export class ExternalMappingsRepository {
  async findByExternal(
    organizationId: string,
    entityType: IntegrableEntityType,
    externalSystem: string,
    externalId: string
  ): Promise<ExternalIdMappingRecord | undefined> {
    const normSys = externalSystem.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<ExternalMappingRow>(
        `
          SELECT ${MAPPING_COLUMNS}
          FROM int_external_id_mappings
          WHERE organization_id = $1
            AND entity_type = $2
            AND external_system = $3
            AND external_id = $4
          LIMIT 1
        `,
        [organizationId, entityType, normSys, externalId]
      )
      return res.rows[0] ? mapExternalMappingRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.externalMappings.find(
      (m) =>
        m.organizationId === organizationId &&
        m.entityType === entityType &&
        m.externalSystem === normSys &&
        m.externalId === externalId
    )
  }

  async listByEntity(
    organizationId: string,
    entityType: IntegrableEntityType,
    entityId: string
  ): Promise<ExternalIdMappingRecord[]> {
    if (isPostgresEnabled()) {
      const res = await queryPg<ExternalMappingRow>(
        `
          SELECT ${MAPPING_COLUMNS}
          FROM int_external_id_mappings
          WHERE organization_id = $1
            AND entity_type = $2
            AND entity_id = $3
          ORDER BY last_synced_at DESC
        `,
        [organizationId, entityType, entityId]
      )
      return res.rows.map(mapExternalMappingRow)
    }

    const db = readDb()
    return db.externalMappings.filter(
      (m) => m.organizationId === organizationId && m.entityType === entityType && m.entityId === entityId
    )
  }

  async upsertMapping(input: {
    organizationId: string
    entityType: IntegrableEntityType
    entityId: string
    externalSystem: string
    externalId: string
    externalUrl?: string | null
    syncDirection?: 'inbound' | 'outbound' | 'bidirectional'
    payloadHash?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<ExternalIdMappingRecord> {
    const normSys = input.externalSystem.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<ExternalMappingRow>(
        `
          INSERT INTO int_external_id_mappings (
            id, organization_id, entity_type, entity_id, external_system, external_id,
            external_url, sync_direction, last_synced_at, payload_hash, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10::jsonb)
          ON CONFLICT (organization_id, entity_type, entity_id, external_system)
          DO UPDATE SET
            external_id = EXCLUDED.external_id,
            external_url = COALESCE(EXCLUDED.external_url, int_external_id_mappings.external_url),
            sync_direction = COALESCE(EXCLUDED.sync_direction, int_external_id_mappings.sync_direction),
            last_synced_at = NOW(),
            payload_hash = COALESCE(EXCLUDED.payload_hash, int_external_id_mappings.payload_hash),
            metadata = COALESCE(EXCLUDED.metadata, int_external_id_mappings.metadata),
            updated_at = NOW()
          RETURNING ${MAPPING_COLUMNS}
        `,
        [
          id,
          input.organizationId,
          input.entityType,
          input.entityId,
          normSys,
          input.externalId,
          input.externalUrl ?? null,
          input.syncDirection ?? 'bidirectional',
          input.payloadHash ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
        ]
      )
      return mapExternalMappingRow(res.rows[0])
    }

    const db = readDb()
    const now = new Date().toISOString()

    const existingIdx = db.externalMappings.findIndex(
      (m) =>
        m.organizationId === input.organizationId &&
        m.entityType === input.entityType &&
        m.entityId === input.entityId &&
        m.externalSystem === normSys
    )

    if (existingIdx >= 0) {
      const updated: ExternalIdMappingRecord = {
        ...db.externalMappings[existingIdx],
        externalId: input.externalId,
        externalUrl: input.externalUrl ?? db.externalMappings[existingIdx].externalUrl,
        syncDirection: input.syncDirection ?? db.externalMappings[existingIdx].syncDirection,
        lastSyncedAt: now,
        payloadHash: input.payloadHash ?? db.externalMappings[existingIdx].payloadHash,
        metadata: input.metadata ?? db.externalMappings[existingIdx].metadata,
      }
      db.externalMappings[existingIdx] = updated
      persistDb(db)
      return updated
    }

    const created: ExternalIdMappingRecord = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      externalSystem: normSys,
      externalId: input.externalId,
      externalUrl: input.externalUrl ?? null,
      syncDirection: input.syncDirection ?? 'bidirectional',
      lastSyncedAt: now,
      payloadHash: input.payloadHash ?? null,
      metadata: input.metadata ?? null,
    }
    db.externalMappings.push(created)
    persistDb(db)
    return created
  }

  async deleteMapping(organizationId: string, mappingId: string): Promise<boolean> {
    if (isPostgresEnabled()) {
      const res = await queryPg(
        `DELETE FROM int_external_id_mappings WHERE organization_id = $1 AND id = $2`,
        [organizationId, mappingId]
      )
      return (res.rowCount ?? 0) > 0
    }

    const db = readDb()
    const before = db.externalMappings.length
    db.externalMappings = db.externalMappings.filter(
      (m) => !(m.organizationId === organizationId && m.id === mappingId)
    )
    if (db.externalMappings.length === before) return false
    persistDb(db)
    return true
  }
}
