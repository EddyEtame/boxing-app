/**
 * Ce que l'app échange avec l'admin pour la messagerie et les notifications
 * (CDC §10, §14) : défini dans @bc/contract (admin.ts), réexporté ici pour
 * les routes de l'admin.
 *
 * POST /api/messages            — l'adhérent écrit à la direction.
 * GET  /api/messages/:id        — l'app relit le fil (en-tête x-bc-thread-token).
 * GET  /api/notifications       — les notifications qui concernent un club et un statut.
 */
export type { MemberMessageRequest, MemberMessageResponse, NotificationsResponse, PublicError, PublicNotification, ThreadMessage, ThreadResponse } from '@bc/contract';
