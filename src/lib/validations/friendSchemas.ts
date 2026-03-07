import { z } from 'zod'

export const addFriendSchema = z.object({
  email: z.string().email('Correo inválido'),
})

export type AddFriendFormValues = z.infer<typeof addFriendSchema>
