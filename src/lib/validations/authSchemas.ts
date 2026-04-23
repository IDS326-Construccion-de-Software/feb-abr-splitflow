import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const resetPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
})

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

const normalizeForPasswordCompare = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const registerSchema = z
  .object({
    email: z.string().email('Correo invalido'),
    password: z
      .string()
      .min(12, 'Usa al menos 12 caracteres')
      .regex(/[a-z]/, 'Incluye una letra minuscula')
      .regex(/[A-Z]/, 'Incluye una letra mayuscula')
      .regex(/[0-9]/, 'Incluye un numero')
      .regex(/[^A-Za-z0-9]/, 'Incluye un simbolo'),
    displayName: z.string().min(2, 'Ingresa tu nombre'),
  })
  .superRefine((data, ctx) => {
    const password = normalizeForPasswordCompare(data.password)
    const email = normalizeForPasswordCompare(data.email)
    const emailName = email.split('@')[0] || ''
    const displayName = normalizeForPasswordCompare(data.displayName)
    const blockedValues = [email, emailName, displayName].filter((value) => value.length >= 2)

    if (blockedValues.some((value) => password === value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'La contrasena no puede ser igual a tu nombre o correo',
      })
    }

    if (emailName.length >= 4 && password.includes(emailName)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'La contrasena no debe contener tu correo',
      })
    }

    const nameParts = displayName.split(/\s+/).filter((part) => part.length >= 4)
    if (nameParts.some((part) => password.includes(part))) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'La contrasena no debe contener tu nombre',
      })
    }
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
