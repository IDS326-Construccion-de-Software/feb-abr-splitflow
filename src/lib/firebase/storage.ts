import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

export const uploadFile = async (path: string, file: File) => {
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}
