# Finanzas · Tesorería: Cuentas Bancarias y Movimientos (`BankAccount` & `PaymentTransaction`)

Especificación funcional y modelo de datos para las entidades de tesorería **Cuentas Bancarias** (`/api/v1/finance/bank-accounts`) y **Movimientos de Tesorería** (`/api/v1/finance/transactions`).

---

## 1. Descripción Funcional

Centraliza los saldos líquidos de la organización en cuentas bancarias operativas, concentradoras y cajas chicas (`BankAccount`), incluyendo los parámetros específicos requeridos por cada paquete de dispersión bancaria (`bankPackValues`), así como el libro auxiliar inmutable de flujos de efectivo (`PaymentTransaction`) generados por cobros a clientes, pagos a proveedores, dispersión de lotes EBP, pago de nómina y gastos operativos.

---

## 2. Entidad 1: Cuentas Bancarias (`CreateBankAccountDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `bankName` | `string` (max 120) | **Sí** | — | Nombre de la institución bancaria o caja (ej. `'BBVA México'`, `'Banorte'`, `'Caja Operativa Vallejo'`). |
| `accountNumber` | `string` (max 40) | **Sí** | — | Número de cuenta o terminación enmascarada (ej. `'**** 4920'`, `'Efectivo'`). |
| `clabe` | `string` (max 32) | **Sí** | `'N/A'` (si caja chica) | CLABE interbancaria de 18 dígitos (validada Mod-10 en MX) o `'N/A'` para `Caja chica`. |
| `balance` | `number` (`>= 0`) | No | `0` | Saldo disponible en moneda de la cuenta. |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'`. |
| `type` | `enum` | **Sí** | — | `'Cheques / Operativa'` \| `'Concentradora'` \| `'Caja chica'`. |
| `bankPackValues` | `Record<packId, Record<key, string>>` | No | `{}` | Valores de configuración empresarial por pack EBP (ej. `emisoraCode`, `contractNumber`, `companyId`, `bicOrigin`). |

### Campos Generados por el Servidor (`BankAccountRecord`)

- `id` (`bank_<ts>`), `createdAt`, `updatedAt`.

---

## 3. Entidad 2: Movimientos de Tesorería (`PaymentTransactionRecord`)

Los movimientos de tesorería son registros *append-only* emitidos automáticamente por el backend al ejecutar transacciones en Cobros, Pagos, Nómina, Lotes EBP y Gastos.

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `id` | `string` (max 64) | Servidor | `txn_<ts>` | Identificador único del movimiento bancario. |
| `folio` | `string` (max 32) | Servidor | `PAG-YYYY-NNN` / `TXN-YYYY-NNN` | Folio secuencial por organización. |
| `date` | `string` (max 40) | Servidor | Fecha actual | Fecha de aplicación del movimiento. |
| `type` | `enum` (`TransactionType`) | **Sí** | — | `'Cobro de cliente'` \| `'Pago a proveedor'` \| `'Gasto operativo'`. |
| `entityName` | `string` (max 180) | **Sí** | — | Nombre del cliente, proveedor o concepto de nómina/gasto. |
| `reference` | `string` (max 250) | **Sí** | — | Clave SPEI, autorización TPV o folio del documento/lote EBP origen. |
| `amount` | `number` | **Sí** | — | Importe de la transacción (puede ser firmado negativo en salidas directas de nómina/gasto o positivo según tipo). |
| `method` | `string` (max 100) | **Sí** | — | Medio de pago (`Transferencia SPEI`, `Tarjeta de crédito`, `Domiciliación bancaria`, `EBP (...)`, etc.). |
| `account` | `string` (max 120) | **Sí** | — | Nombre de la cuenta bancaria afectada. |

---

## 4. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/finance/bank-accounts` | Lista cuentas bancarias y sus saldos actuales | `Finanzas.Resumen` / `Cobros` / `Pagos` (`read`) |
| `POST` | `/api/v1/finance/bank-accounts` | Registra nueva cuenta bancaria o caja chica | `Finanzas.Pagos Bancarios` (`write`) |
| `PATCH` | `/api/v1/finance/bank-accounts/:id` | Actualiza datos de cuenta o `bankPackValues` por pack EBP | `Finanzas.Pagos Bancarios` (`write`) |
| `PUT` | `/api/v1/finance/bank-accounts/:id/pack-values/:packId` | Guarda parámetros dinámicos de empresa para un pack EBP específico | `Finanzas.Pagos Bancarios` (`write`) |
| `GET` | `/api/v1/finance/transactions` | Lista paginada de transacciones filtrable por `type`, `account`, `method`, `fromDate`, `toDate`, `search` | `Finanzas.Resumen` (`read`) |

---

## 5. Reglas de Negocio

1. **Integridad de Saldos Bancarios:** El campo `balance` de `fin_bank_accounts` solo debe modificarse de forma atómica (`balance = balance + delta`) dentro de transacciones de Cobro (`+`), Pago CxP (`-`), Gasto (`-`), Nómina (`-`) o Lote EBP (`-`), impidiendo saldos negativos cuando es un cargo.
2. **Exclusión de Caja Chica en EBP:** Las cuentas con `type === 'Caja chica'` no son elegibles como cuenta ordenante en el asistente de dispersión bancaria electrónica (`EbpBatchWizardModal`).
3. **Inmutabilidad de Transacciones:** No se exponen `PATCH` ni `DELETE` sobre `/transactions` para preservar la conciliación bancaria.
