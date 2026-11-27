# Administración · Flujos de Devoluciones (`ReturnWorkflows`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Flujos de Trabajo y Aprobaciones de Devoluciones** (`/api/v1/admin/return-workflows`).

---

## 1. Descripción Funcional

Configura de forma declarativa las máquinas de estado, reglas de transición, umbrales monetarios de autorización y roles aprobadores que gobiernan las devoluciones de **Clientes (Ventas → Devoluciones)** y **Proveedores (Compras → Devoluciones)**. Permite aplicar plantillas predefinidas (`standard`, `strict_final`, `agile`) o personalizar cada etapa de forma independiente.

---

## 2. Estructura y Campos (`UpdateReturnWorkflowsDTO`)

El recurso raíz `ReturnWorkflowsSettings` contiene exactamente dos configuraciones independientes: `customer` (Devoluciones de Clientes) y `supplier` (Devoluciones a Proveedores).

### Configuración por Entidad (`ReturnEntityWorkflowConfig`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `initialStatus` | `enum` (`CustomerReturnStatus` \| `SupplierReturnStatus`) | **Sí** | `'Solicitada'` / `'Borrador'` | Estado inicial asignado automáticamente al crear una nueva devolución. |
| `preventDeleteAfterSettlement` | `boolean` | **Sí** | `true` | Bloquea la eliminación de devoluciones que ya aplicaron inventario o nota de crédito financiera. |
| `steps` | `ReturnWorkflowStepRule[]` | **Sí** | 5 etapas | Definición de cada estado posible, su habilitación, aprobaciones y transiciones salientes. |
| `updatedAtIso` | `string` (`date-time`) | No (servidor) | `NOW()` | Timestamp ISO-8601 de la última modificación guardada (sobrescrito por el servidor). |
| `updatedBy` | `string` (max 150) | No (servidor) | Actor JWT | Nombre del usuario que guardó la configuración (derivado del token de sesión). |

### Regla por Etapa (`ReturnWorkflowStepRule`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `status` | `enum` | **Sí** | — | Nombre del estado (`CustomerReturnStatus` o `SupplierReturnStatus`). |
| `enabled` | `boolean` | **Sí** | `true` | Indica si la etapa está activa dentro del flujo de la organización. |
| `isFinalState` | `boolean` | **Sí** | — | Marca si es un estado terminal (cierra el ciclo de la devolución). |
| `requiresApproval` | `boolean` | **Sí** | `false` | Exige aprobación explícita (`approvalStatus = 'pending' -> 'approved'`) antes de completar la transición. |
| `approverRole` | `enum` (`WorkflowApproverRole`) | **Sí** | `'Cualquier editor'` | Rol requerido para aprobar: `'Cualquier editor'`, `'Operaciones'`, `'Finanzas'`, `'Administrador'`. |
| `approvalThresholdAmount` | `number` (`>= 0`) | **Sí** | `0` | Monto mínimo (`total`) a partir del cual aplica `requiresApproval` (`0` = siempre que `requiresApproval = true`). |
| `requireNotesOnEntry` | `boolean` | **Sí** | `false` | Obliga a capturar un motivo o comentario al transicionar hacia esta etapa. |
| `requireDocumentRefOnEntry` | `boolean` | No | `false` | Aplicable principalmente en proveedor: exige referencia RMA o nota de crédito externa al entrar al estado. |
| `allowedNextStatuses` | `enum[]` | **Sí** | `[]` | Estados destino permitidos desde esta etapa. Debe ser `[]` si `isFinalState = true`. |

### Estados Permitidos por Tipo

- **`CustomerReturnStatus` (`customer`):**
  1. `'Solicitada'`
  2. `'En tránsito a almacén'`
  3. `'Recibida en almacén'`
  4. `'Nota de crédito emitida'`
  5. `'Rechazada'`
- **`SupplierReturnStatus` (`supplier`):**
  1. `'Borrador'`
  2. `'Autorizada por proveedor'`
  3. `'Enviada a proveedor'`
  4. `'Acreditada / compensada'`
  5. `'Cancelada'`

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/admin/return-workflows` | Obtiene la configuración vigente (`customer` y `supplier`) | `Administración.Flujos de devoluciones` (`read`) |
| `PUT` | `/api/v1/admin/return-workflows` | Guarda y valida la configuración completa de ambos flujos | `Administración.Flujos de devoluciones` (`write`) |
| `PATCH` | `/api/v1/admin/return-workflows/:kind` | Actualiza únicamente el flujo `'customer'` o `'supplier'` | `Administración.Flujos de devoluciones` (`write`) |
| `POST` | `/api/v1/admin/return-workflows/:kind/preset` | Construye/aplica una plantilla (`'standard'`, `'strict_final'`, `'agile'`) | `Administración.Flujos de devoluciones` (`write`) |
| `POST` | `/api/v1/admin/return-workflows/reset` | Restaura la configuración estándar por defecto (`DEFAULT_RETURN_WORKFLOWS`) | `Administración.Flujos de devoluciones` (`full`) |

---

## 4. Validaciones del Grafo de Estados y Reglas de Negocio

El backend debe validar con `422 Unprocessable Entity` cada configuración (`customer` y `supplier`) antes de persistir:

1. **Estado Inicial Válido:** Debe existir un paso en `steps` con `status === initialStatus` y `enabled === true`.
2. **Estado Inicial No Terminal:** El paso correspondiente a `initialStatus` **no** puede tener `isFinalState === true`.
3. **Salida Obligatoria desde Estado Inicial:** El paso de `initialStatus` debe tener al menos 1 destino válido en `allowedNextStatuses` (habilitado y distinto de sí mismo).
4. **Al Menos un Estado Final:** Debe existir al menos 1 etapa con `enabled === true` y `isFinalState === true`.
5. **Integridad de Transiciones:**
   - Si `isFinalState === true`, `allowedNextStatuses` debe ser vacío (`[]`).
   - Todo estado listado en `allowedNextStatuses` debe corresponder a un paso habilitado (`enabled === true`) y no auto-referenciarse (`target !== step.status`).
6. **Aplicación en Runtime (Ventas y Compras):**
   - Al crear una devolución, su estado inicial se resuelve desde `initialStatus` de la configuración activa.
   - Al intentar avanzar de estado, si el paso destino tiene `requiresApproval === true` y `return.total >= approvalThresholdAmount`, la transición queda en estado pendiente (`approvalStatus: 'pending'`, `pendingTargetStatus: targetStatus`) hasta ser autorizada por un usuario cuyo rol efectivo cumpla `approverRole`.
7. **Auditoría:** Toda actualización emite un registro en `audit_logs` con `category: 'admin'`, `crudOperation: 'UPDATE'`, `entityType: 'Flujos de devoluciones'`, `entityId: 'return_workflows'`.
