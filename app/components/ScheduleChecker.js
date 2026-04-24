'use client';
import { useEffect, useRef } from 'react';
import { pollDatabase } from '../services/pollDatabase';

export function useScheduleChecker(polls, onPollStarted) {
  const intervalRef = useRef(null);

  useEffect(() => {
    const check = async () => {
      const now = new Date();
      const scheduled = polls.filter(p => p.status === 'scheduled' && p.scheduledFor);

      for (const poll of scheduled) {
        const scheduledTime = new Date(poll.scheduledFor);
        if (scheduledTime <= now) {
          console.log(`⏰ Auto-starting scheduled poll: ${poll.question}`);
          try {
            await pollDatabase.updatePoll(poll.id, { status: 'draft' });
            await pollDatabase.updatePollStatus(poll.id, 'active');
            if (onPollStarted) onPollStarted();
          } catch (e) { console.error('Failed to auto-start poll:', e); }
        }
      }
    };

    check();
    intervalRef.current = setInterval(check, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [polls]);
}

export function timeUntil(isoString) {
  if (!isoString) return '';
  const diff = new Date(isoString) - new Date();
  if (diff <= 0) return 'Starting now...';
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  return `in ${mins}m`;
}
