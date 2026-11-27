# Gastos · Presupuestos y Alertas (`ExpenseBudgetRule`)

Especificación funcional y modelo de datos para la gestión de techos mensuales y alertas preventivas/críticas de gasto (`/api/v1/expenses/budgets`).

---

## 1. Descripción Funcional

Define límites presupuestales mensuales por naturaleza contable (`Administrativo`, `Operativo`, `Financiero`, `Costo de venta`, `Impuestos`), opcionalmente acotados por rubro o departamento, junto con umbrales porcentuales de advertencia (`warningThresholdPct`, default `80%`) y alerta crítica (`criticalThresholdPct`, default `95%`). Soporta edición individual, edición masiva en matriz y homologación global de umbrales.

---

## 2. Campos Obligatorios vs. Opcionales (`UpsertExpenseBudgetDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `nature` | `enum` (`ExpenseNature`) | **Sí** | — | `'Administrativo'` \| `'Operativo'` \| `'Financiero'` \| `'Costo de venta'` \| `'Impuestos'`. |
| `monthlyLimit` | `number` (`> 0`) | **Sí** | — | Tope presupuestal mensual en moneda base. |
| `warningThresholdPct` | `number` (`10–98`) | No | `80` | Porcentaje de consumo que dispara alerta preventiva. |
| `criticalThresholdPct` | `number` (`warning+1 – 100`) | No | `95` | Porcentaje de consumo que dispara alerta crítica (siempre `> warningThresholdPct`). |
| `alertsEnabled` | `boolean` | No | `true` | Habilita o silencia notificaciones visuales/automáticas para la regla. |
| `active` | `boolean` | No | `true` | Estado activo de la regla presupuestal. |
| `category` | `enum \| null` | No | `null` | Subcategoría específica (`ExpenseCategory`) si la regla no es general de naturaleza. |
| `departmentName` | `string \| null` (max 120) | No | `null` | Departamento específico si aplica restricción granular. |

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/expenses/budgets` | Lista reglas y consumo calculado del mes seleccionado (`monthKey=YYYY-MM`) | `Gastos.Presupuestos y alertas` (`read`) |
| `PUT` | `/api/v1/expenses/budgets` | Crea o actualiza una regla presupuestal (upsert por `id` o `nature`) | `Gastos.Presupuestos y alertas` (`write`) |
| `PUT` | `/api/v1/expenses/budgets/matrix` | Guarda en lote los límites y umbrales de las 5 naturalezas | `Gastos.Presupuestos y alertas` (`write`) |
| `PUT` | `/api/v1/expenses/budgets/global-thresholds` | Aplica `warningThresholdPct`, `criticalThresholdPct` y `alertsEnabled` a todas las reglas activas | `Gastos.Presupuestos y alertas` (`write`) |
| `PATCH` | `/api/v1/expenses/budgets/:id/toggle` | Activa/pausa regla presupuestal | `Gastos.Presupuestos y alertas` (`write`) |

---

## 4. Reglas de Negocio

1. **Invariante de Umbrales:** `warningThresholdPct` se acota al rango `[10, 98]` y `criticalThresholdPct` al rango `[warningThresholdPct + 1, 100]`.
2. **Cálculo de Consumo:** Excluye siempre pólizas en estado `'Cancelado'`. Calcula `consumedPct = (spent / monthlyLimit) * 100`.
3. **Auditoría:** Todo ajuste de límites o umbrales registra evento en `audit_logs` (`category: 'finance'`).
