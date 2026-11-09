import { useMemo } from 'react'
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  ReceiptText,
  Wallet,
  ArrowRight,
  Clock,
  ShieldCheck,
  CreditCard,
  Building2,
  DollarSign,
} from 'lucide-react'
import type {
  BankAccount,
  InvoiceReceivable,
  BillPayable,
  ExpenseRecord,
  PaymentTransaction,
} from '../data/finance'

interface FinanceOverviewProps {
  bankAccounts: BankAccount[]
  receivables: InvoiceReceivable[]
  payables: BillPayable[]
  expenses: ExpenseRecord[]
  transactions: PaymentTransaction[]
  onNavigateSection: (sec: 'Cobros' | 'Pagos' | 'Gastos' | 'Resumen') => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function FinanceOverview({
  bankAccounts,
  receivables,
  payables,
  expenses: _expenses,
  transactions,
  onNavigateSection,
}: FinanceOverviewProps) {
  // Total cash in banks
  const totalCash = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + b.balance, 0)
  }, [bankAccounts])

  // Total receivables balance
  const totalReceivable = useMemo(() => {
    return receivables.reduce((acc, r) => acc + r.balance, 0)
  }, [receivables])

  // Total payables balance
  const totalPayable = useMemo(() => {
    return payables.reduce((acc, p) => acc + p.balance, 0)
  }, [payables])

  // Working capital
  const workingCapital = totalCash + totalReceivable - totalPayable

  const getTransactionTypeBadge = (type: PaymentTransaction['type']) => {
    switch (type) {
      case 'Cobro de cliente':
        return (
          <span className="badge-entry">
            <ArrowDownLeft size={11} /> Cobro recibido
          </span>
        )
      case 'Pago a proveedor':
        return (
          <span className="badge-exit">
            <ArrowUpRight size={11} /> Pago a proveedor
          </span>
        )
      case 'Gasto operativo':
        return (
          <span className="badge-adjust">
            <CreditCard size={11} /> Gasto operativo
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="operations-overview-container">
      {/* KPI Top Cards */}
      <div className="ops-kpi-grid">
        <article className="ops-kpi-card highlight">
          <div className="ops-kpi-top">
            <span>LIQUIDEZ / DISPONIBLE</span>
            <span className="ops-kpi-icon icon-green">
              <Landmark size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{money(totalCash)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-up">
              <ShieldCheck size={13} /> {bankAccounts.length} cuentas
            </span>
            <small>en tesorería activa</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>CUENTAS POR COBRAR (CXC)</span>
            <span className="ops-kpi-icon icon-blue">
              <ReceiptText size={16} />
            </span>
          </div>
          <div className="ops-kpi-val text-positive">{money(totalReceivable)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-neutral">
              {receivables.filter((r) => r.balance > 0).length} facturas
            </span>
            <small>pendientes de cobro</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>CUENTAS POR PAGAR (CXP)</span>
            <span className="ops-kpi-icon icon-amber">
              <Wallet size={16} />
            </span>
          </div>
          <div className="ops-kpi-val text-negative">{money(totalPayable)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-down">
              {payables.filter((p) => p.balance > 0).length} pasivos
            </span>
            <small>programados con proveedores</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>CAPITAL DE TRABAJO NETO</span>
            <span className="ops-kpi-icon icon-green">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{money(workingCapital)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-up">Posición sólida</span>
            <small>Caja + CXC - CXP</small>
          </div>
        </article>
      </div>

      {/* Middle Split: Bank Accounts & Liquidity vs Maturity Breakdown */}
      <div className="ops-overview-split">
        {/* Bank Accounts Panel */}
        <section className="ops-panel-card">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">TESORERÍA Y BANCOS</div>
              <h3>Cuentas Bancarias y Disponibilidad</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigateSection('Cobros')}
            >
              Ver cobranza <ArrowRight size={13} />
            </button>
          </div>

          <div className="warehouses-capacity-list">
            {bankAccounts.map((account) => {
              const percentage = totalCash > 0 ? Math.round((account.balance / totalCash) * 100) : 0

              return (
                <div key={account.id} className="warehouse-capacity-card">
                  <div className="wh-cap-top">
                    <div>
                      <div className="wh-code-badge">{account.type}</div>
                      <strong>{account.bankName}</strong>
                      <div className="wh-address-text">
                        <Building2 size={11} /> Cuenta: {account.accountNumber} · CLABE: {account.clabe}
                      </div>
                    </div>
                    <div className="wh-percent-badge">
                      <span>{money(account.balance)}</span>
                      <small>{percentage}% del disponible</small>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="wh-progress-track">
                    <span
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#456a61',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="ops-shortcuts-box">
            <span className="shortcuts-title">Acciones rápidas de tesorería</span>
            <div className="shortcuts-grid">
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Cobros')}
              >
                <DollarSign size={14} /> Registrar cobro
              </button>
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Pagos')}
              >
                <Wallet size={14} /> Pagar proveedor
              </button>
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Gastos')}
              >
                <CreditCard size={14} /> Registrar gasto
              </button>
            </div>
          </div>
        </section>

        {/* Projected Commitments and Maturity */}
        <section className="ops-panel-card">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">PROYECCIÓN DE FLUJO</div>
              <h3>Cobros vs. Pagos Próximos</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigateSection('Pagos')}
            >
              Ir a Pagos <ArrowRight size={13} />
            </button>
          </div>

          <div className="flow-projection-grid">
            <div className="flow-projection-card incoming">
              <div className="flow-proj-head">
                <ArrowDownLeft size={15} />
                <span>Cobros por ingresar (CXC)</span>
              </div>
              <div className="flow-proj-val text-positive">{money(totalReceivable)}</div>
              <small>Facturas pendientes emitidas a clientes</small>
            </div>

            <div className="flow-projection-card outgoing">
              <div className="flow-proj-head">
                <ArrowUpRight size={15} />
                <span>Compromisos de pago (CXP)</span>
              </div>
              <div className="flow-proj-val text-negative">{money(totalPayable)}</div>
              <small>Cuentas por liquidar a proveedores</small>
            </div>
          </div>

          <div className="flow-net-banner">
            <div className="flow-net-left">
              <strong>Balance neto proyectado</strong>
              <small>Diferencia entre cobros previstos y pasivos</small>
            </div>
            <div
              className={`flow-net-val ${
                totalReceivable - totalPayable >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {money(totalReceivable - totalPayable)} MXN
            </div>
          </div>

          {/* Overdue alert note if exists */}
          {receivables.some((r) => r.status === 'Vencida') && (
            <div className="reorder-item-row" style={{ marginTop: '8px' }}>
              <div className="reorder-item-info">
                <strong>Alerta de morosidad en cartera</strong>
                <small>Existen facturas vencidas que requieren gestión de cobranza inmediata.</small>
              </div>
              <button
                className="button button-secondary reorder-btn"
                onClick={() => onNavigateSection('Cobros')}
              >
                Gestionar
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Activity Section: Recent Payments & Transactions */}
      <section className="ops-panel-card" style={{ marginTop: '14px' }}>
        <div className="ops-panel-header">
          <div>
            <div className="panel-kicker">MOVIMIENTOS DE TESORERÍA</div>
            <h3>Últimas Transacciones y Dispersiones</h3>
          </div>
          <button
            className="text-link"
            onClick={() => onNavigateSection('Cobros')}
          >
            Ver cuentas bancarias <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>FOLIO</th>
                <th>FECHA</th>
                <th>TIPO DE MOVIMIENTO</th>
                <th>ENTIDAD / CONCEPTO</th>
                <th>CUENTA BANCARIA</th>
                <th>MÉTODO DE PAGO</th>
                <th>REFERENCIA</th>
                <th style={{ textAlign: 'right' }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 6).map((txn) => {
                const isIncome = txn.type === 'Cobro de cliente'
                return (
                  <tr key={txn.id}>
                    <td>
                      <strong>{txn.folio}</strong>
                    </td>
                    <td className="date-cell">
                      <div className="date-icon-cell">
                        <Clock size={12} /> {txn.date}
                      </div>
                    </td>
                    <td>{getTransactionTypeBadge(txn.type)}</td>
                    <td>
                      <strong style={{ fontSize: '9.5px', color: '#2a372f' }}>
                        {txn.entityName}
                      </strong>
                    </td>
                    <td>
                      <span className="warehouse-name-cell">
                        <Building2 size={12} /> {txn.account}
                      </span>
                    </td>
                    <td>
                      <span className="payment-method-tag">{txn.method}</span>
                    </td>
                    <td>
                      <span className="ref-tag">{txn.reference}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      <strong className={isIncome ? 'text-positive' : 'text-negative'}>
                        {isIncome ? `+${money(txn.amount)}` : `-${money(txn.amount)}`}
                      </strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
