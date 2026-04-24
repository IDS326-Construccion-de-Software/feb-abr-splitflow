const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type CloudinaryUploadResponse = {
  secure_url?: string
  error?: {
    message?: string
  }
}

export const uploadProfileImage = async (file: File) => {
  validateProfileImage(file)

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Falta configurar Cloudinary en las variables de entorno.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )
  const data = (await response.json()) as CloudinaryUploadResponse

  if (!response.ok || !data.secure_url) {
    if (response.status === 401 && data.error?.message?.toLowerCase().includes('unknown api key')) {
      throw new Error(
        'Cloudinary rechazo la subida. Verifica que el upload preset exista, este en modo Unsigned y pertenezca al cloud name configurado.',
      )
    }

    throw new Error(data.error?.message || 'No pudimos subir la imagen a Cloudinary.')
  }

  return data.secure_url
}

const validateProfileImage = (file: File) => {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Usa una imagen JPG, PNG o WebP.')
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error('La imagen debe pesar 2 MB o menos.')
  }
}
