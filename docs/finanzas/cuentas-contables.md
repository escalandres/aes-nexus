# Finanzas · Cuentas Contables (`ChartAccount`)

Especificación funcional, reglas de numeración contable y validaciones para el **Catálogo de Cuentas Contables** (`/api/v1/finance/chart-accounts`).

---

## 1. Descripción Funcional

Administra el plan de cuentas contables de la organización clasificado por rubro mayor (`1xxx` a `8xxx`), naturaleza (`Deudora` / `Acreedora`), saldo acumulado y estado operativo (`Activa` / `Inactiva`). Alimenta directamente el **Estado de Resultados** (`IncomeStatementReport`), la **Clasificación de Gastos** y los asientos automáticos de dispersión EBP, nómina y compras.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateChartAccountDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `code` | `string` (max 16) | **Sí** | Sugerido (`suggestNextAccountCode`) | Formato `^[12345678]\d{3}(?:-\d{1,4})?$` (ej. `'1002-001'`). Único por organización. |
| `name` | `string` (max 180) | **Sí** | — | Nombre descriptivo de la cuenta contable. |
| `type` | `enum` (`AccountType`) | **Sí** | `'Activo circulante'` | Uno de los 10 subtipos contables permitidos (ver tabla de rangos abajo). |
| `nature` | `enum` | **Sí** | Según `type` | `'Deudora'` \| `'Acreedora'`. |
| `balance` | `number` | No | `0` | Saldo contable inicial o actual en moneda base. |
| `description` | `string \| null` (max 500) | No | `null` | Descripción de uso o reglas de cargo/abono. |
| `status` | `enum` | No | `'Activa'` | `'Activa'` \| `'Inactiva'`. |

### Campos Generados por el Servidor (`ChartAccountRecord`)

- `id` (`acc_<ts>`), `createdAt`, `updatedAt`.

---

## 3. Reglas de Numeración Contable (`ACCOUNT_NUMBERING_RULES`)

El backend debe validar estrictamente (`validateAccountCodeForType`) que el prefijo numérico de `code` coincida con `type`:

| Prefijo | Rango | Rubro Mayor | Subtipos (`AccountType`) Permitidos | Sub-rangos de Sugerencia | Naturaleza Default |
|---|---|---|---|---|---|
| `1` | `1xxx` | Activos | `'Activo circulante'`, `'Activo no circulante'` | `1000–1199` / `1200–1999` | `'Deudora'` |
| `2` | `2xxx` | Pasivos | `'Pasivo a corto plazo'`, `'Pasivo a largo plazo'` | `2000–2099` / `2100–2999` | `'Acreedora'` |
| `3` | `3xxx` | Capital / Patrimonio | `'Capital contable'` | `3000–3999` | `'Acreedora'` |
| `4` | `4xxx` | Ingresos | `'Ingresos'` | `4000–4999` | `'Acreedora'` |
| `5` | `5xxx` | Costos de ventas | `'Costos'` | `5000–5999` | `'Deudora'` |
| `6` | `6xxx` | Gastos | `'Gastos de operación'` | `6000–6999` | `'Deudora'` |
| `7` | `7xxx` | Gastos financieros | `'Gastos financieros'` | `7000–7999` | `'Deudora'` |
| `8` | `8xxx` | Otros ingresos | `'Otros ingresos'` | `8000–8999` | `'Acreedora'` |

---

## 4. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/finance/chart-accounts` | Lista ordenada por código; filtrable por `macroType` (`Activo \| Pasivo \| Capital \| Ingreso \| Gasto`), `type`, `nature`, `status`, `search` | `Finanzas.Cuentas contables` (`read`) |
| `GET` | `/api/v1/finance/chart-accounts/suggest-code?type=...` | Devuelve el siguiente código libre sugerido según `SUBTYPE_NUMBER_BOUNDS` | `Finanzas.Cuentas contables` (`read`) |
| `GET` | `/api/v1/finance/chart-accounts/export.xlsx` | Exporta catálogo filtrado a Excel (`Catalogo_Cuentas_Contables_<YYYY-MM-DD>.xlsx`) | `Finanzas.Cuentas contables` (`read`) |
| `POST` | `/api/v1/finance/chart-accounts` | Crea cuenta validando unicidad de `code` y correspondencia de rango con `type` | `Finanzas.Cuentas contables` (`write`) + `balanceReports` |
| `PATCH` | `/api/v1/finance/chart-accounts/:id` | Edita código, nombre, tipo, naturaleza, saldo, descripción o estado | `Finanzas.Cuentas contables` (`write`) + `balanceReports` |
| `DELETE` | `/api/v1/finance/chart-accounts/:id` | Elimina cuenta contable (`409` si es una cuenta sistémica con movimientos vinculados) | `Finanzas.Cuentas contables` (`full`) |

---

## 5. Reglas de Negocio y Auditoría

1. **Validación Estricta de Código y Tipo:** Todo `POST` y `PATCH` verifica regex `/^[12345678]\d{3}(?:-\d{1,4})?$/` y coincidencia entre el primer dígito de `code` y `type`. Si no coincide, rechaza con `422 Unprocessable Entity`.
2. **Unicidad de Código:** `code.trim().toLowerCase()` debe ser único por `organization_id` (`409 Conflict` en duplicados).
3. **Ordenamiento Natural:** Las respuestas de listado se ordenan lexicográficamente con colación numérica por `code` (`1001-001`, `1002-001`, ...).
4. **Auditoría:** Altas, modificaciones y eliminaciones emiten evento en `audit_logs` (`category: 'finance'`).
