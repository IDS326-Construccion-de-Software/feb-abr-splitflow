import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase/config'

const ACTIVITY_COLLECTION = 'activityLogs'

export type ActivityPayload = {
  entityType: 'group' | 'expense' | 'settlement'
  entityId: string
  groupId?: string
  action: 'create' | 'update' | 'delete'
  actorUid: string
  meta?: Record<string, unknown>
}

export const logActivity = async (payload: ActivityPayload) => {
  const data: Record<string, unknown> = {
    entityType: payload.entityType,
    entityId: payload.entityId,
    action: payload.action,
    actorUid: payload.actorUid,
    createdAt: serverTimestamp(),
  }

  const groupId = payload.groupId?.trim()
  if (groupId) data.groupId = groupId

  if (payload.meta) {
    const meta = { ...payload.meta }
    Object.keys(meta).forEach((key) => {
      if (meta[key] === undefined) delete meta[key]
    })
    if (Object.keys(meta).length > 0) data.meta = meta
  }

  await addDoc(collection(db, ACTIVITY_COLLECTION), data)
}
