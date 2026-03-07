import { z } from 'zod'

export const groupSchema = z.object({
  name: z.string().min(3, 'Ingresa un nombre de grupo'),
  description: z.string().max(200, 'Máximo 200 caracteres').optional(),
  memberEmails: z.string().trim().optional(),
})

export type CreateGroupFormValues = z.infer<typeof groupSchema>
