import { useQuery } from '@tanstack/react-query';
import { read } from '../api/socialApi';
import { communityRead } from '../../communities/api/communityApi';

/** Separate from bell notifications: backed by saved message/channel read cursors. */
export function useMessageUnread() {
  return useQuery({ queryKey: ['conversations', 'unread-count'],
    queryFn: () => read('/conversations/unread-count'), staleTime: 20_000 });
}
export function useCommunityUnread() {
  return useQuery({ queryKey: ['communities', 'unread-summary'],
    queryFn: () => communityRead('/communities/unread-summary'), staleTime: 20_000 });
}
