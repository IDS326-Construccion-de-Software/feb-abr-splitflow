import { FirebaseError } from 'firebase/app'

export const isAuthPopupCancelled = (error: unknown): boolean => {
  return (
    error instanceof FirebaseError &&
    (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
  )
}

export const friendlyAuthError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Ese correo ya está registrado. Inicia sesión o usa otro correo.'
      case 'auth/invalid-email':
        return 'Correo inválido.'
      case 'auth/operation-not-allowed':
        return 'El método de autenticación no está habilitado en Firebase.'
      case 'auth/weak-password':
        return 'La contraseña es muy débil (mínimo 6 caracteres).'
      case 'auth/popup-closed-by-user':
        return 'La ventana de Google se cerró antes de completar el acceso.'
      case 'auth/popup-blocked':
        return 'El navegador bloqueó la ventana emergente de Google.'
      case 'auth/unauthorized-domain':
        return 'Dominio no autorizado en Firebase (agrega localhost en Authentication > Settings).'
      case 'auth/network-request-failed':
        return 'Fallo de red. Verifica tu conexión.'
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera un momento e inténtalo otra vez.'
      case 'auth/user-not-found':
        return 'No encontramos una cuenta con ese correo.'
      default:
        return 'No pudimos completar la autenticación. Intenta nuevamente.'
    }
  }
  return 'Ocurrió un error inesperado. Intenta nuevamente.'
}
