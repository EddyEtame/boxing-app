/**
 * Ce que l'app échange avec l'admin pour la messagerie et les notifications
 * (CDC §10, §14) : défini dans @bc/contract (admin.ts), réexporté ici pour
 * les routes de l'admin.
 *
 * POST /api/messages            — l'adhérent écrit à la direction.
 * GET  /api/messages            — les fils de l'adhérent de la session.
 * GET  /api/messages/recus      — ce que l'équipe lui a écrit.
 * GET  /api/messages/:id        — l'app relit le fil (x-bc-thread-token ou session du propriétaire).
 * GET  /api/notifications       — les notifications qui concernent un club et un statut.
 */
export type { MemberMessageRequest, MemberMessageResponse, MemberThreadSummary, MemberThreadsResponse, NotificationsResponse, PublicError, PublicNotification, ReceivedMessage, ReceivedMessagesResponse, ThreadMessage, ThreadResponse } from '@bc/contract';
