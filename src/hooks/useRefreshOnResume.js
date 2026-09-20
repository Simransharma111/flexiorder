import { useEffect, useRef } from 'react';
import { subscribeToRefresh } from '../utils/refreshOnResume';

export default function useRefreshOnResume(refresh, intervalMs = 0) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; }, [refresh]);
  useEffect(() => subscribeToRefresh(() => latest.current(), { intervalMs }), [intervalMs]);
}
