import { z } from 'zod'

const round2 = (n: number) => Math.round(n * 100) / 100

export const expenseSchema = z
  .object({
    description: z.string().min(2, 'Agrega una descripcion'),
    amount: z
      .number()
      .positive('El monto debe ser mayor a 0')
      .transform((n) => round2(n)),
    currency: z.string().min(1, 'Moneda requerida'),
    date: z.string().min(1, 'Ingresa una fecha'),
    paidBy: z.string().min(1, 'Selecciona quien pago'),
    splitType: z.enum(['equal', 'custom']),
    participantIds: z.array(z.string()).min(1, 'Selecciona al menos un participante'),
    splits: z.array(
      z.object({
        uid: z.string(),
        amount: z
          .number()
          .nonnegative()
          .transform((n) => round2(n)),
      }),
    ),
  })
  .refine((data) => data.participantIds.includes(data.paidBy), {
    message: 'El pagador debe ser parte del gasto',
    path: ['paidBy'],
  })
  .refine(
    (data) => {
      const participantIds = new Set(data.participantIds)
      if (data.splits.length !== data.participantIds.length) return false
      return data.splits.every((split) => participantIds.has(split.uid))
    },
    {
      message: 'Cada participante debe tener un split valido',
      path: ['splits'],
    },
  )
  .refine(
    (data) => {
      const total = data.splits.reduce((sum, split) => sum + split.amount, 0)
      return Math.abs(round2(total) - data.amount) <= 0.01
    },
    {
      message: 'La suma de los splits debe igualar al monto (+/-0.01)',
      path: ['splits'],
    },
  )

export type ExpenseFormValues = z.infer<typeof expenseSchema>
