# Finanzas · Pagos Bancarios EBP (`BankFormatPack` & `ElectronicPaymentBatch`)

Especificación funcional, motor de plantillas DSL, validadores bancarios y reglas de dispersión para el submódulo **Pagos Bancarios / Electronic Bank Payments (EBP)** (`/api/v1/finance/ebp/*`).

---

## 1. Descripción Funcional

Implementa una arquitectura de **7 Pilares** para generar, validar, descargar y aplicar lotes de dispersión electrónica bancaria tanto para **Nómina** (`payroll_runs`) como para **Proveedores** (`ap_bills`):
1. **Esquemas dinámicos de empresa (`companyBankSchema`)** y **beneficiario (`beneficiaryBankSchema`)**.
2. **Catálogos bancarios embebidos (`embeddedCatalogs`)** validados contra códigos oficiales de cada banco.
3. **Motor DSL agnóstico (`templateBody`)** con soporte de `#each`, `#groupBy`, `#if` y helpers (`padLeft`, `padRight`, `cents`, `decimal`, `noAccents`, `upper`, `digits`, `trunc`, `dateFmt`, `clabeBank`, `clabePlaza`, `clabeAccount`, `lineSeq`, `sum`, `sumCents`, `count`, `xmlEscape`, `csv`, `catalogLabel`).
4. **Codificación y terminador exactos:** `UTF-8`, `UTF-8-BOM`, `ISO-8859-1` o `ASCII` estricto 7-bit; `CRLF` o `LF`.
5. **Marketplace & Studio (`.aespak.json`):** Instalación, licenciamiento, importación/exportación JSON y creación de layouts personalizados.
6. **Multi-banco para Proveedores:** Selección de cuenta bancaria preferida por moneda (`SupplierBankAccount`) y modo de agregación `individual` o `consolidated` (múltiples facturas CxP consolidadas por proveedor en `billAllocations[]`).
7. **Aplicación Contable y Bancaria (`POST /batches/:id/apply`):** Liquida facturas CxP o corridas de nómina, debita cuenta bancaria y actualiza cuentas contables (`1002-*`, `2001-001`, `2005-001`, `6002-001`).

---

## 2. Entidad 1: Paquetes de Formato Bancario (`BankFormatPack`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` (max 80) | **Sí** | `pack_custom_<ts>` | Identificador único del pack. |
| `packCode` | `string` (max 48) | **Sí** | — | Código técnico del formato (ej. `'BBVA-NC-NOM-MX'`, `'BANORTE-BEM-PROV-MX'`). |
| `version` | `string` (semver, max 24) | **Sí** | `'1.0.0'` | Versión del paquete. |
| `name` | `string` (max 150) | **Sí** | — | Nombre legible en Marketplace. |
| `bankName` | `string` (max 100) | **Sí** | — | Institución bancaria destino. |
| `country` | `string` (max 16) | **Sí** | `'MX'` | País o `'GLOBAL'`. |
| `operationType` | `enum` | **Sí** | `'both'` | `'payroll'` \| `'vendor_payment'` \| `'both'`. |
| `channel` | `enum` | **Sí** | `'mixed'` | `'same_bank'` \| `'interbank_spei'` \| `'mixed'`. |
| `description` | `string` (max 600) | **Sí** | — | Descripción funcional del layout. |
| `companyBankSchema` | `EbpDynamicFieldSchema[]` | **Sí** | `[]` | Campos adicionales requeridos en la cuenta bancaria ordenante. |
| `beneficiaryBankSchema` | `EbpDynamicFieldSchema[]` | **Sí** | `[]` | Campos adicionales requeridos por cada beneficiario/línea. |
| `embeddedCatalogs` | `Record<string, EbpEmbeddedCatalog>` | **Sí** | `{}` | Catálogos de códigos internos del banco (`select_catalog`). |
| `templateBody` | `string` | **Sí** | — | Plantilla DSL que renderiza el archivo bancario final. |
| `encoding` | `enum` (`EbpEncoding`) | **Sí** | `'ISO-8859-1'` | `'UTF-8'` \| `'UTF-8-BOM'` \| `'ISO-8859-1'` \| `'ASCII'`. |
| `outputExtension` | `string` (max 16) | **Sí** | `'.txt'` | Extensión del archivo generado (`'.txt'`, `'.csv'`, `'.xml'`). |
| `lineEnding` | `enum` | **Sí** | `'CRLF'` | `'CRLF'` \| `'LF'`. |
| `filenamePattern` | `string` (max 180) | **Sí** | — | Plantilla DSL para el nombre de archivo descargado. |
| `supportedCurrencies` | `EbpCurrency[]` | **Sí** | `['MXN']` | `['MXN' | 'USD' | 'EUR']`. |
| `licenseTier` | `enum` | **Sí** | `'included'` | `'included'` \| `'promo'` \| `'paid'`. |
| `priceLabel` | `string` (max 80) | **Sí** | — | Etiqueta comercial de licencia. |
| `installed` | `boolean` | **Sí** | `true` | Si el pack está activo en la instancia. |
| `licenseActive` | `boolean` | **Sí** | `true` | Si la licencia permite generar lotes en producción. |
| `isCustomPack` | `boolean` | No | `false` | Indica si fue creado/editado en Template Studio. |

---

## 3. Entidad 2: Lotes de Dispersión (`CreateEbpBatchDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `batchType` | `enum` | **Sí** | — | `'Nómina'` \| `'Proveedores'`. |
| `aggregationMode` | `enum` | No | `'individual'` / `'consolidated'` | `'individual'` \| `'consolidated'` (agrupado por proveedor + cuenta bancaria). |
| `packId` | `string` (max 80) | **Sí** | — | ID del `BankFormatPack` instalado y licenciado, compatible con `batchType` y `currency`. |
| `bankAccountId` | `string` (max 64) | **Sí** | — | ID de la cuenta ordenante (`type !== 'Caja chica'`). |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'` \| `'EUR'`. |
| `sourceRefId` | `string` (max 250) | **Sí** | — | ID de `payroll_run` o lista CSV de IDs de `ap_bills`. |
| `sourceFolio` | `string` (max 80) | **Sí** | — | Folio origen (ej. `'NOM-2026-Q21'` o `'LOTE-CXP (3 fact.)'`). |
| `executionDate` | `string` (`YYYY-MM-DD`) | **Sí** | Fecha actual | Fecha programada de dispersión bancaria. |
| `lines` | `ElectronicPaymentBatchLine[]` | **Sí** | — | Líneas incluidas (`included === true` y `validationErrors.length === 0`). |

### Campos Generados por el Servidor (`ElectronicPaymentBatchRecord`)

- `id` (`ebp_batch_<ts>`), `folio` (`EBP-YYYY-NNNN`), `packName`, `packVersion`, `bankAccountName`, `operationsCount`, `totalAmount`, `status` (`'Validado' | 'Archivo generado' | 'Aplicado en banco' | 'Rechazado'`), `generatedFilename`, `generatedContent`, `encoding`, `createdAt`, `appliedAt?`.

---

## 4. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/finance/ebp/packs` | Lista packs del catálogo global/marketplace (`installed`, `extension`, `search`) | `Finanzas.Pagos Bancarios` (`read`) |
| `POST` | `/api/v1/finance/ebp/packs/import` | Importa un paquete `.aespak.json` validado | `Finanzas.Pagos Bancarios` (`write`) |
| `PUT` | `/api/v1/finance/ebp/packs/:id` | Crea o actualiza un pack personalizado desde Template Studio | `Finanzas.Pagos Bancarios` (`write`) |
| `POST` | `/api/v1/finance/ebp/packs/:id/install` / `uninstall` | Activa o desactiva un pack en la organización | `Finanzas.Pagos Bancarios` (`write`) |
| `GET` | `/api/v1/finance/ebp/batches` | Lista lotes de dispersión generados y su estado | `Finanzas.Pagos Bancarios` (`read`) |
| `POST` | `/api/v1/finance/ebp/batches` | Valida campos dinámicos + CLABE Mod-10, renderiza `templateBody` y crea lote `'Archivo generado'` | `Finanzas.Pagos Bancarios` (`write`) |
| `GET` | `/api/v1/finance/ebp/batches/:id/download` | Descarga el archivo bancario con su codificación y `lineEnding` exactos | `Finanzas.Pagos Bancarios` (`read`) |
| `POST` | `/api/v1/finance/ebp/batches/:id/apply` | Aplica el lote en banco: liquida nómina o CxP, descuenta saldo bancario y actualiza contabilidad | `Finanzas.Pagos Bancarios` (`write`) |
| `DELETE` | `/api/v1/finance/ebp/batches/:id` | Elimina lote (`409` si ya fue `'Aplicado en banco'`) | `Finanzas.Pagos Bancarios` (`full`) |

---

## 5. Reglas de Validación y Aplicación Contable

1. **Validación Bancaria Previa (`validateClabeMod10` + `validateEbpFieldValue`):**
   - En MX (o cuentas de 18 dígitos), toda CLABE debe pasar el algoritmo Módulo 10 (`pesos [3, 7, 1]`).
   - Cada campo en `companyBankSchema` y `beneficiaryBankSchema` valida `required`, `digitsOnly`, `minLength`, `maxLength`, `regex`, `clabeMod10` y pertenencia al catálogo embebido (`select_catalog`).
   - No se permite generar un lote si existen líneas activas (`included = true`) con `validationErrors.length > 0`.
2. **Aplicación de Lote de Nómina (`POST /batches/:id/apply` cuando `batchType === 'Nómina'`):**
   - Verifica `bankAccount.balance >= batch.totalAmount`.
   - Si la corrida `payroll_run` aún no estaba `'Pagada'`, la marca `'Pagada'` y ejecuta `settlePayrollInFinance` (descuento bancario, transacción `TXN`, gasto `GAS`, CxP de retenciones ISR/IMSS si aplica). Si ya estaba liquidada, registra únicamente el cargo bancario y transacción.
3. **Aplicación de Lote de Proveedores (`POST /batches/:id/apply` cuando `batchType === 'Proveedores'`):**
   - Recorre `line.billAllocations[]` (modo consolidado) o `line.sourceLineId` (modo individual) para incrementar `ap_bills.paidAmount`, recalcular `balance` y pasar a `'Pagada'` o `'Parcial'`.
   - Descuenta `fin_bank_accounts.balance -= batch.totalAmount`.
   - Genera un `PaymentTransaction` (`PAG-YYYY-NNN`, `type: 'Pago a proveedor'`) por cada línea del lote.
   - Actualiza saldos contables en `fin_chart_accounts`: debita/disminuye la cuenta bancaria (`1002-001` o `1002-002`) y disminuye `2001-001` (*Proveedores nacionales por pagar*).
   - Cambia estado del lote a `'Aplicado en banco'` con `appliedAt`.
4. **Auditoría:** Todas las acciones de lotes y packs registran evento en `audit_logs` (`category: 'finance'`).
