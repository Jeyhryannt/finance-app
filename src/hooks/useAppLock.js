import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { gate } from '../security/lockGate';
import { getConfig } from '../security/lock';
import { LOCK_AFTER_MS } from '../security/policy';

export default function useAppLock() {
  const [config, setConfig] = useState({ enabled: false, bio: false });
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const away = useRef(null); // { at, ignored }

  const refresh = useCallback(async () => {
    const c = await getConfig();
    setConfig(c);
    return c;
  }, []);

  useEffect(() => {
    refresh().then((c) => { setLocked(c.enabled); setReady(true); });
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') {
        away.current = { at: Date.now(), ignored: gate.suspend };
      } else if (st === 'active' && away.current) {
        const { at, ignored } = away.current;
        away.current = null;
        if (config.enabled && !ignored && Date.now() - at > LOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [config.enabled]);

  return { ready, locked, config, refresh, unlock: () => setLocked(false), lockNow: () => setLocked(true) };
}
