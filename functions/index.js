const admin = require('firebase-admin')
const { logger } = require('firebase-functions')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')

admin.initializeApp()

const db = admin.firestore()
const messaging = admin.messaging()

exports.sendFriendRequestNotification = onDocumentCreated('friendships/{friendshipId}', async (event) => {
  const friendshipSnap = event.data
  if (!friendshipSnap) return

  const friendship = friendshipSnap.data()
  if (friendship.status !== 'pending') return

  const { requesterId, addresseeId } = friendship
  if (!requesterId || !addresseeId) return

  const [requesterSnap, tokensSnap] = await Promise.all([
    db.collection('users').doc(requesterId).get(),
    db.collection('users').doc(addresseeId).collection('notificationTokens').get(),
  ])

  const tokenDocs = tokensSnap.docs.filter((docSnap) => typeof docSnap.get('token') === 'string')
  const tokens = tokenDocs.map((docSnap) => docSnap.get('token'))

  if (!tokens.length) {
    logger.info('No notification tokens registered for friend request recipient.', {
      friendshipId: event.params.friendshipId,
      addresseeId,
    })
    return
  }

  const requester = requesterSnap.data() || {}
  const requesterName = requester.displayName || requester.email || 'Alguien'
  const link = '/friends'
  const absoluteLink = getAbsoluteLink(link)
  const message = {
    tokens,
    data: {
      type: 'friend_request',
      friendshipId: event.params.friendshipId,
      title: 'Nueva solicitud de amistad',
      body: `${requesterName} quiere agregarte en SplitFlow.`,
      link,
    },
  }

  if (absoluteLink) {
    message.webpush = {
      fcmOptions: {
        link: absoluteLink,
      },
    }
  }

  const response = await messaging.sendEachForMulticast(message)
  const staleDeletes = response.responses
    .map((result, index) => {
      if (result.success || !isInvalidTokenError(result.error)) return null
      return tokenDocs[index].ref.delete()
    })
    .filter(Boolean)

  await Promise.all(staleDeletes)

  logger.info('Friend request notification processed.', {
    friendshipId: event.params.friendshipId,
    successCount: response.successCount,
    failureCount: response.failureCount,
  })
})

const isInvalidTokenError = (error) => {
  return (
    error?.code === 'messaging/invalid-registration-token' ||
    error?.code === 'messaging/registration-token-not-registered'
  )
}

const getAbsoluteLink = (path) => {
  const baseUrl = process.env.APP_BASE_URL || getDefaultHostingUrl()
  if (!baseUrl) return null
  return new URL(path, baseUrl).toString()
}

const getDefaultHostingUrl = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
  if (!projectId) return null
  return `https://${projectId}.web.app`
}
