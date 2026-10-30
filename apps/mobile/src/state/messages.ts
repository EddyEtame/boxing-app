import { useMessageThread } from '@/state/message-thread';

/** 1 si le fil direction a une mise a jour non lue depuis la derniere ouverture. */
export function useUnreadCount(): number {
  const preview = useMessageThread((s) => s.preview);
  const lastSeenAt = useMessageThread((s) => s.lastSeenAt);
  if (!preview) return 0;
  if (!lastSeenAt) return 1;
  return Date.parse(preview.updatedAt) > Date.parse(lastSeenAt) ? 1 : 0;
}
