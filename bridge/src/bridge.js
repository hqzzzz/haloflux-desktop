/**
 * HALOFLUX Bridge — Web client half.
 *
 * Registers into `shell.overlay` exactly like the halo plugin (so the slot's
 * standard props useSessions / useSessionStatus are provided) but renders
 * nothing: the component returns null, zero pixels. Its only job is to keep a
 * `createHalofluxLive` bound to the on-screen session and POST snapshots
 * (scalars + tool rows + drained token batches) to the Host relay.
 *
 * Depends on: `createHalofluxLive` (src/live.js, inlined into client.js by build.mjs).
 */
  const BRIDGE_URL = 'http://127.0.0.1:52771';
  const PUSH_MS = 220;
  const TOKEN_CAP = 240;

  const selectMainSessionId = (state) => {
    if (!state || !state.byId) return undefined;
    const rows = Object.values(state.byId);
    for (const row of rows) if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return row.id;
    return rows.length === 1 && rows[0] ? rows[0].id : undefined;
  };

  const selectMainBlank = (state) => {
    if (!state || !state.byId) return false;
    const id = selectMainSessionId(state);
    const row = id === undefined ? undefined : state.byId[id];
    return !!(row && row.blank === true);
  };

  function BridgeLayer(props) {
    const { useSessions, useSessionStatus } = props;
    const sessionsSvc = props.__sessions;

    const sessionId = useSessions(selectMainSessionId);
    const blank = useSessions(selectMainBlank);
    const present = sessionId !== undefined && !blank;
    const stateSelector = React.useCallback((map) => {
      const hit = map && map.get ? map.get(sessionId) : undefined;
      return hit ? hit.running === true : undefined;
    }, [sessionId]);
    const running = useSessionStatus(stateSelector);

    const sessionRef = React.useRef(sessionId);
    sessionRef.current = sessionId;
    const presentRef = React.useRef(present);
    presentRef.current = present;
    const runningRef = React.useRef(running);
    runningRef.current = running;

    React.useEffect(() => {
      let live = null;
      try {
        live = createHalofluxLive({
          getSessionId: () => sessionRef.current,
          bindingOf: (id) => {
            try {
              return sessionsSvc && typeof sessionsSvc.binding === 'function'
                ? sessionsSvc.binding(id) : undefined;
            } catch { return undefined; }
          },
        });
      } catch { return undefined; }

      const timer = setInterval(() => {
        try {
          live.setSession(sessionRef.current);
          const on = presentRef.current === true;
          live.sessionPresent = on;
          live.setRunning(on && runningRef.current === true);
          let tokens = [];
          try { tokens = live.pullTokens(TOKEN_CAP) || []; } catch { tokens = []; }
          const payload = { ts: Date.now() };
          for (const k in live) {
            try {
              const v = live[k];
              const ty = typeof v;
              if (ty === 'number' || ty === 'string' || ty === 'boolean') payload[k] = v;
              else if (Array.isArray(v)) payload[k] = v.slice(0, 12);
            } catch { /* one bad getter must not stop the feed */ }
          }
          payload.sessionPresent = on;
          payload.running = on && runningRef.current === true;
          if (tokens.length) payload.tokens = tokens.slice(0, TOKEN_CAP);
          fetch(BRIDGE_URL + '/push', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(() => { /* bridge server down: wallpaper stays in animation mode */ });
        } catch { /* never break the host UI from the bridge */ }
      }, PUSH_MS);

      return () => {
        clearInterval(timer);
        try { if (live) live.dispose(); } catch { /* gone */ }
      };
    }, []);

    return null; // zero pixels: the overlay row exists only for its slot props
  }

  const HalofluxBridge = {
    inject: ['slots', 'sessions'],
    apply(ctx) {
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'haloflux-bridge',
        order: 999,
        label: () => 'HALOFLUX Bridge',
      }, function BridgeBound(props) {
        return BridgeLayer({ ...props, __sessions: ctx.get('sessions') });
      }));
    },
  };
