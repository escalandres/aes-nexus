# Backend · Reglas de Multimoneda, Tipos de Cambio y Redondeo (`/docs/backend/multimoneda-y-redondeo.md`)

Cierra las decisiones de multimoneda marcadas como pendientes en `/docs/PHASE_0.md` y alinea el motor financiero del backend con `src/services/currencyService.ts`.

---

## 1. Monedas Soportadas y Moneda de Reporte

- **Moneda de reporte por organización (`reportingCurrency`):** Configurada en `cfg_workspace_settings.reporting_currency` (default `'MXN'`). Todos los tableros ejecutivos y el Estado de Resultados (P&L) consolidado convierten importes a esta moneda base.
- **Monedas transaccionales soportadas en catálogo inicial:** `MXN`, `USD`, `EUR`, `VES`, `COP`, `BRL` (extensible vía tabla `sys_currencies`).

---

## 2. Fuente y Fecha Efectiva del Tipo de Cambio (FX)

| Regla | Definición Aprobada |
|---|---|
| **Tabla de referencia (`fin_fx_rates`)** | Almacena `(base_currency, quote_currency, rate NUMERIC(18,6), effective_date DATE, source VARCHAR(40))` |
| **Fuente oficial primaria (México)** | `BANXICO_FIX` (publicado el día hábil bancario anterior por Banco de México para USD/MXN) con respaldo `ECB_REF` / `MANUAL_ADMIN` |
| **Fecha efectiva al emitir documento** | Cotizaciones, pedidos, facturas CxC, órdenes de compra, facturas CxP y pólizas de gasto toman el **tipo de cambio vigente a la `issue_date` del documento** (`exchange_rate NUMERIC(18,6)`) |
| **Inmutabilidad histórica** | Cada documento guarda su `currency` (moneda original), `exchange_rate` (tasa congelada al emitir) y `reporting_amount` (`amount * exchange_rate`), evitando que cambios futuros de FX alteren el pasado |
| **Override manual por documento** | Permitido en creación/edición cuando el usuario captura un tipo de cambio pactado (`exchange_rate_source = 'manual'`), quedando auditado |

---

## 3. Precisión Numérica y Reglas de Redondeo

1. **Tipos de columna en PostgreSQL:**
   - Importes monetarios (`subtotal`, `tax`, `total`, `unit_price`, `paid_amount`, `balance`): **`NUMERIC(18, 2)`** (o `NUMERIC(18, 4)` para precios unitarios de catálogo/compras antes de multiplicar por cantidad).
   - Cantidades de inventario y líneas: **`NUMERIC(18, 4)`** (permite fracciones en kilos, litros, horas).
   - Tipos de cambio (`exchange_rate`): **`NUMERIC(18, 6)`**.
   - Porcentajes (`tax_rate`, descuentos, márgenes): **`NUMERIC(7, 4)`**.
2. **Regla de redondeo:**
   - Cálculo por línea: `line_subtotal = ROUND(quantity * unit_price * (1 - discount_pct / 100), 2)` con redondeo estándar **`MidpointRounding.AwayFromZero` (`ROUND_HALF_UP`)**, compatible con validaciones CFDI 4.0 del SAT.
   - Impuestos (`IVA 16%` / `0%` / `8%`): calculados por línea y sumados al encabezado (`tax_amount = SUM(line_tax)`), garantizando cuadre exacto `total = subtotal + tax_amount` sin centavos huérfanos.

---

## 4. Diferencia Cambiaria en Cobros y Pagos (CxC / CxP)

Cuando una factura emitida en moneda distinta a la `reportingCurrency` (ej. `USD` al `TC 17.50`) se cobra o paga posteriormente a otro tipo de cambio (ej. `TC 17.85`):
- La factura se liquida en su moneda original (`balance = 0` en `USD`).
- El movimiento bancario (`fin_payment_transactions`) registra el flujo real en la moneda de la cuenta bancaria (`bankAccount.currency`) y guarda `fx_rate_applied`.
- La diferencia `(payment_fx_rate - invoice_fx_rate) * applied_amount` se registra automáticamente en `fin_fx_gain_loss_entries` (cuenta contable `7001-001` / `4002-001` según corresponda a pérdida o utilidad cambiaria realizada) para reflejo fiel en P&L.
