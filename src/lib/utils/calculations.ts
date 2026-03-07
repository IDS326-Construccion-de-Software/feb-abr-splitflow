import type { Expense, ExpenseSplit } from '../../types/expense'
import type { Settlement } from '../../types/settlement'

// positivo: me deben, negativo: debo
export type NetBalances = Record<string, number>

const round2 = (n: number): number => Math.round(Number(n) * 100) / 100 || 0

const ensureZeros = (balances: NetBalances, ids: string[]) => {
  ids.forEach((uid) => {
    if (balances[uid] === undefined) balances[uid] = 0
  })
}

const getSplitUid = (split: ExpenseSplit | { uid?: string; userId?: string }) =>
  split.uid || ('userId' in split ? split.userId : undefined)

/**
 * BALANCES DE GRUPO
 * Acredita lo pagado al pagador y debita a cada participante su parte.
 * Los pagos reducen la deuda del que paga y reducen el credito del que recibe.
 */
export const calculateGroupBalances = (
  expenses: Expense[],
  settlements: Settlement[],
  memberIds?: string[],
): NetBalances => {
  const balances: NetBalances = {}

  const allIds = new Set<string>()
  memberIds?.forEach((id) => allIds.add(id))
  expenses.forEach((expense) => {
    if (expense.paidBy) allIds.add(expense.paidBy)
    expense.participantIds?.forEach((id) => allIds.add(id))
    expense.splits?.forEach((split) => {
      const uid = getSplitUid(split)
      if (uid) allIds.add(uid)
    })
  })
  settlements.forEach((payment) => {
    if (payment.fromUserId) allIds.add(payment.fromUserId)
    if (payment.toUserId) allIds.add(payment.toUserId)
  })

  ensureZeros(balances, Array.from(allIds))

  const inc = (uid: string | undefined, amount: number) => {
    if (!uid) return
    balances[uid] = round2((balances[uid] || 0) + amount)
  }

  expenses.forEach((expense) => {
    const total = round2(expense.amount)
    if (!expense.paidBy || total === 0) return

    inc(expense.paidBy, total)

    const splits = Array.isArray(expense.splits) ? expense.splits : []
    splits.forEach((split) => {
      const uid = getSplitUid(split)
      const share = round2(split.amount)
      if (!uid || share === 0) return
      inc(uid, -share)
    })
  })

  settlements.forEach((payment) => {
    const amount = round2(payment.amount)
    if (amount === 0) return

    // Quien paga sube su balance porque reduce su deuda.
    inc(payment.fromUserId, amount)
    // Quien recibe baja su balance porque reduce su credito pendiente.
    inc(payment.toUserId, -amount)
  })

  return balances
}

// Alias de compatibilidad con componentes existentes
export const computeGroupNetBalances = (
  expenses: Expense[],
  settlements: Settlement[],
  memberIds?: string[],
): NetBalances => calculateGroupBalances(expenses, settlements, memberIds)

export const validateGroupBalances = (net: NetBalances): boolean => {
  const total = Object.values(net).reduce((sum, amount) => sum + amount, 0)
  return Math.abs(round2(total)) < 0.01
}

export const mergeNetBalances = (list: NetBalances[]): NetBalances =>
  list.reduce((acc, balances) => {
    Object.entries(balances).forEach(([uid, amount]) => {
      acc[uid] = round2((acc[uid] || 0) + amount)
    })
    return acc
  }, {} as NetBalances)

/**
 * DIVISION IGUAL CON RESIDUO
 * Reparte los centavos sobrantes a los primeros N usuarios.
 */
export const splitEquallyWithRemainder = (amount: number, memberIds: string[]): ExpenseSplit[] => {
  const count = memberIds.length
  if (count === 0) return []

  const totalCents = Math.round(round2(amount) * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainderCents = totalCents - baseCents * count

  return memberIds.map((userId, index) => ({
    uid: userId,
    amount: round2((baseCents + (index < remainderCents ? 1 : 0)) / 100),
  }))
}

/**
 * BALANCES POR USUARIO
 * Consolida saldos persona a persona cruzando las transferencias de cada grupo.
 */
export interface UserGroupContext {
  id: string
  memberIds: string[]
  expenses: Expense[]
  settlements: Settlement[]
}

export const calculateUserBalances = (userId: string, groups: UserGroupContext[]) => {
  const userBalances: Record<string, number> = {}

  groups.forEach((group) => {
    const groupBalances = calculateGroupBalances(group.expenses, group.settlements, group.memberIds)
    const transfers = simplifyTransfers(groupBalances)

    transfers.forEach((transfer) => {
      if (transfer.from === userId) {
        userBalances[transfer.to] = round2((userBalances[transfer.to] || 0) - transfer.amount)
      }

      if (transfer.to === userId) {
        userBalances[transfer.from] = round2((userBalances[transfer.from] || 0) + transfer.amount)
      }
    })
  })

  return Object.entries(userBalances)
    .map(([uid, amount]) => ({ userId: uid, amount }))
    .filter((balance) => Math.abs(balance.amount) > 0.01)
}

export const calculateTotalOwedToMe = (balances: Array<{ userId: string; amount: number }>) =>
  balances.reduce((sum, balance) => (balance.amount > 0 ? round2(sum + balance.amount) : sum), 0)

export const calculateTotalOwed = (balances: Array<{ userId: string; amount: number }>) =>
  balances.reduce((sum, balance) => (balance.amount < 0 ? round2(sum + Math.abs(balance.amount)) : sum), 0)

export const formatCurrency = (amount: number, currency: string = 'RD$'): string =>
  `${currency}${Math.abs(round2(amount)).toFixed(2)}`

export interface Transfer {
  from: string
  to: string
  amount: number
}

// Greedy para traducir balances netos a "X debe a Y".
export const simplifyTransfers = (net: NetBalances): Transfer[] => {
  const debtors = Object.entries(net)
    .filter(([, amount]) => amount < -0.01)
    .map(([uid, amount]) => [uid, Math.abs(round2(amount))] as [string, number])

  const creditors = Object.entries(net)
    .filter(([, amount]) => amount > 0.01)
    .map(([uid, amount]) => [uid, round2(amount)] as [string, number])

  const transfers: Transfer[] = []

  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const [debtorUid, debtorAmount] = debtors[debtorIndex]
    const [creditorUid, creditorAmount] = creditors[creditorIndex]
    const amount = round2(Math.min(debtorAmount, creditorAmount))

    if (amount > 0) {
      transfers.push({ from: debtorUid, to: creditorUid, amount })
    }

    debtors[debtorIndex][1] = round2(debtorAmount - amount)
    creditors[creditorIndex][1] = round2(creditorAmount - amount)

    if (debtors[debtorIndex][1] < 0.01) debtorIndex += 1
    if (creditors[creditorIndex][1] < 0.01) creditorIndex += 1
  }

  return transfers
}
