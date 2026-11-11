import { useEffect, useRef, useState } from 'react';
import { loadStops, indexData, findStop, tripStops } from './lib/data.js';
import { DEMO_RAW, DEMO_CODE } from './lib/demo.js';
import { createTracker } from './lib/tracker.js';
import { unlockAudio, testAlert, startAlarm } from './lib/alarm.js';
import { useTheme, useWakeLock, lastStop } from './lib/hooks.js';
import * as I from './icons.jsx';

const DEMO = indexData(DEMO_RAW);

export default function App() {
  const [themeMode, cycleTheme] = useTheme();
  const [data, setData] = useState({ status: __PREVIEW__ ? 'missing' : 'loading', value: null });
  const [screen, setScreen] = useState('enter');
  const [found, setFound] = useState(null);
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    if (__PREVIEW__) return;
    loadStops()
      .then((value) => setData({ status: 'ready', value }))
      .catch(() => setData({ status: 'missing', value: null }));
  }, []);

  useEffect(() => {
    document.title = screen === 'alert' ? 'Yours is the next stop' : 'Bus Stop Alert';
  }, [screen]);

  const startTrip = (source, demo, r) => {
    unlockAudio();
    setTrip({ demo, pos: r.pos, route: r.route, headsign: r.headsign, stops: tripStops(source, r.pi) });
    setScreen('riding');
  };

  const startDemo = () => startTrip(DEMO, true, findStop(DEMO, DEMO_CODE).routes[0]);

  // Returns an error message, or null after moving on.
  const lookUp = (code) => {
    if (data.status === 'loading') return 'Stop data is still loading. Try again in a moment.';
    if (data.status === 'missing') return 'Stop data isn’t available here, so stop numbers can’t be looked up yet. Try the demo ride instead.';
    const f = findStop(data.value, code);
    if (!f) return `There’s no stop ${code}. Check the 5-digit number on the stop sign.`;
    if (f.routes.length === 0) return `No buses are scheduled at stop ${code}.`;
    lastStop.set(code);
    if (f.routes.length === 1 && f.routes[0].pos > 0) {
      startTrip(data.value, false, f.routes[0]);
      return null;
    }
    setFound(f);
    setScreen('route');
    return null;
  };

  const goHome = () => {
    setTrip(null);
    setScreen('enter');
  };

  const theme = <ThemeButton mode={themeMode} onClick={cycleTheme} />;

  if (screen === 'route' && found) {
    return <PickRoute found={found} theme={theme} onBack={goHome} onPick={(r) => startTrip(data.value, false, r)} />;
  }
  if (screen === 'riding' && trip) {
    return <Riding trip={trip} theme={theme} onStop={goHome} onArrive={() => setScreen('alert')} />;
  }
  if (screen === 'alert' && trip) {
    return <Alert trip={trip} onDone={goHome} />;
  }
  return <EnterStop dataStatus={data.status} theme={theme} onFind={lookUp} onDemo={startDemo} />;
}

function ThemeButton({ mode, onClick }) {
  const label = { system: 'Theme: match device', light: 'Theme: light', dark: 'Theme: dark' }[mode];
  const Icon = { system: I.Auto, light: I.Sun, dark: I.Moon }[mode];
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={`${label}. Tap to change.`} title={label}>
      <Icon />
    </button>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon"><I.Bus /></span>
      <span>Bus Stop Alert</span>
    </div>
  );
}

function EnterStop({ dataStatus, theme, onFind, onDemo }) {
  const [code, setCode] = useState(() => lastStop.get());
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!/^\d+$/.test(clean)) {
      setError('Enter the number from the stop sign, digits only.');
      return;
    }
    setError(onFind(clean) || '');
  };

  return (
    <main className="screen">
      <header className="bar">
        <Brand />
        {theme}
      </header>

      <div className="intro">
        <h1 className="title-xl">Which stop is yours?</h1>
        <p className="muted lead">Enter your stop number and we’ll warn you one stop early.</p>
      </div>

      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="stop">Stop number</label>
          <input
            id="stop"
            className="stop-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="go"
            maxLength={6}
            placeholder="51234"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby="stop-help"
          />
          <p id="stop-help" className={error ? 'error' : 'muted small'} role={error ? 'alert' : undefined}>
            {error || 'It’s the 5-digit number on the bus stop sign.'}
          </p>
        </div>
        <button type="submit" className="btn btn-primary">Find my stop</button>
      </form>

      {dataStatus === 'missing' && (
        <p className="note">This preview has no TransLink stop data, so it can’t look up real stops. The demo ride shows how the alert works.</p>
      )}

      <div className="foot">
        <button type="button" className="btn btn-quiet" onClick={onDemo}>Try a demo ride</button>
        <p className="muted small with-icon"><I.Pin /> Your location is used only while this page is open.</p>
      </div>
    </main>
  );
}

function RouteBadge({ route, small }) {
  return <span className={small ? 'badge badge-sm' : 'badge'}>{route}</span>;
}

function PickRoute({ found, theme, onBack, onPick }) {
  const { stop, routes } = found;
  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link-btn" onClick={onBack}><I.Back /> Change stop</button>
        {theme}
      </header>

      <section className="card stop-card" aria-label="Your stop">
        <span className="muted small">Your stop</span>
        <span className="stop-code">{stop.code}</span>
        <span className="stop-name">{stop.name}</span>
      </section>

      <div className="intro">
        <h1 className="title-l">Which bus are you on?</h1>
        <p className="muted">Several routes use this stop. Pick yours so we know which stop comes just before it.</p>
      </div>

      <ul className="routes">
        {routes.map((r) => (
          <li key={`${r.pi}-${r.pos}`}>
            <button type="button" className="route" onClick={() => onPick(r)} disabled={r.pos === 0}>
              <RouteBadge route={r.route} />
              <span className="route-name">{r.headsign || `Route ${r.route}`}</span>
              {r.pos === 0 ? <span className="muted small">Starts here</span> : <I.Next />}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Riding({ trip, theme, onStop, onArrive }) {
  const [current, setCurrent] = useState(-1);
  const [gps, setGps] = useState(trip.demo ? 'demo' : 'waiting');
  const wake = useWakeLock(true);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;

  const target = trip.pos;
  const dest = trip.stops[target];

  useEffect(() => {
    const tracker = createTracker(trip.stops, target);
    const feed = (pos) => {
      const { current: c, fire } = tracker.update(pos);
      setCurrent(c);
      if (fire) arrive.current();
    };

    if (trip.demo) {
      // Move from the first stop to the target, a quarter stop every 1.2 s.
      let t = 0;
      const id = setInterval(() => {
        t += 0.25;
        const i = Math.min(Math.floor(t), target - 1);
        const f = Math.min(t - i, 1);
        const a = trip.stops[i];
        const b = trip.stops[i + 1];
        feed({ lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, accuracy: 10 });
        if (t >= target) clearInterval(id);
      }, 1200);
      feed({ ...trip.stops[0], accuracy: 10 });
      return () => clearInterval(id);
    }

    if (!('geolocation' in navigator)) {
      setGps('unsupported');
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGps(p.coords.accuracy > 100 ? 'weak' : 'ok');
        feed({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [trip, target]);

  const gpsText = {
    demo: 'Demo ride. Your real location isn’t used.',
    waiting: 'Finding your location…',
    ok: 'Location on',
    weak: 'Weak GPS signal. The alert may come a little late.',
    denied: 'Location is blocked. Allow it for this site in your browser settings, then start again.',
    unavailable: 'Can’t get your location right now. Still trying.',
    unsupported: 'This browser can’t share your location.',
  }[gps];
  const gpsProblem = ['denied', 'unsupported', 'weak', 'unavailable'].includes(gps);

  const start = Math.max(0, target - 4);
  const rows = [];
  if (current >= 0 && current < start) {
    rows.push({ i: current });
    if (start - current > 1) rows.push({ gap: start - current - 1 });
  }
  for (let i = start; i <= target; i++) rows.push({ i });

  const toGo = current < 0 ? null : target - current;

  return (
    <main className="screen">
      <header className="bar">
        <div className="trip-head">
          <RouteBadge route={trip.route} small />
          <span className="trip-headsign">{trip.headsign}</span>
        </div>
        {theme}
      </header>

      <div className="countdown" aria-live="polite">
        {toGo === null ? (
          <p className="finding">Finding where you are…</p>
        ) : (
          <p className="count">
            <span className="count-num">{toGo}</span>
            <span className="count-label">{toGo === 1 ? 'stop to go' : 'stops to go'}</span>
          </p>
        )}
        <p className="muted lead">Getting off at {dest.name}</p>
      </div>

      <ol className="card line" aria-label="Upcoming stops">
        {rows.map((row) => {
          if (row.gap) {
            return <li key="gap" className="stop-row is-gap"><span className="dot-col" /><span className="muted small">{row.gap} more {row.gap === 1 ? 'stop' : 'stops'}</span></li>;
          }
          const { i } = row;
          const s = trip.stops[i];
          const state = i === target ? 'target' : i === target - 1 ? 'alert' : i === current ? 'here' : i < current ? 'passed' : 'ahead';
          const isHere = i === current;
          return (
            <li key={i} className={`stop-row is-${state}${isHere ? ' is-current' : ''}`}>
              <span className="dot-col"><span className="dot" /></span>
              <span className="stop-row-name">{s.name}</span>
              {state === 'target' && <span className="pill pill-solid">Your stop</span>}
              {state === 'alert' && (isHere
                ? <span className="pill pill-outline">You’re here</span>
                : <span className="pill pill-outline"><I.Bell size={13} width={2.4} /> Alert here</span>)}
              {state === 'here' && <span className="here-label">You’re here</span>}
              {state === 'passed' && <span className="faint small">Passed</span>}
            </li>
          );
        })}
      </ol>

      <div className="status">
        <p className={`with-icon small ${gpsProblem ? 'warn' : 'muted'}`}><I.Pin /> {gpsText}</p>
        <p className={`with-icon small ${wake === 'on' ? 'muted' : 'warn'}`}>
          <I.Phone /> {wake === 'on' ? 'Screen stays awake. Keep this page open.' : 'Keep the screen on and this page open, or the alert can’t go off.'}
        </p>
      </div>

      <div className="foot">
        <button type="button" className="btn btn-outline" onClick={testAlert}>Test the alert</button>
        <button type="button" className="btn btn-quiet" onClick={onStop}>Stop tracking</button>
      </div>
    </main>
  );
}

function Alert({ trip, onDone }) {
  const dest = trip.stops[trip.pos];
  useEffect(() => startAlarm(), []);
  return (
    <main className="screen screen-alert" role="alertdialog" aria-labelledby="alert-title">
      <header className="bar"><Brand /></header>
      <div className="alert-body">
        <span className="alert-bell"><I.Bell size={46} /></span>
        <h1 id="alert-title" className="alert-title">Yours is the next stop</h1>
        <p className="alert-sub">Ring the bell now.</p>
      </div>
      <div className="alert-stop">
        <span className="stop-name">{dest.name}</span>
        <span>Stop {dest.code}, route {trip.route}</span>
      </div>
      <div className="foot">
        <button type="button" className="btn btn-ink" onClick={onDone}>Got it</button>
        <p className="small center">The alert repeats until you tap.</p>
      </div>
    </main>
  );
}
