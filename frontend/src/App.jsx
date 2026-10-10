import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const USD_TO_INR = 95.4;
const SCALE_MIN = 5;
const SCALE_MAX = 48;

/* ── SVG Icon Components ── */

const Icon = ({ d, size = 18, color = "currentColor", className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const HomeIcon = (p) => <Icon {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />;
const ClockIcon = (p) => <Icon {...p} d="M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2" />;
const RefreshIcon = (p) => <Icon {...p} d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15" />;
const ZapIcon = (p) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const BarChartIcon = (p) => <Icon {...p} d="M12 20V10 M18 20V4 M6 20v-4" />;
const TrendingUpIcon = (p) => <Icon {...p} d="M23 6l-9.5 9.5-5-5L1 18" />;
const LayersIcon = (p) => <Icon {...p} d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />;
const ShieldIcon = (p) => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const CheckCircleIcon = (p) => <Icon {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3" />;
const TargetIcon = (p) => <Icon {...p} d="M12 2a10 10 0 100 20 10 10 0 000-20z M12 6a6 6 0 100 12 6 6 0 000-12z M12 10a2 2 0 100 4 2 2 0 000-4z" />;
const DatabaseIcon = (p) => <Icon {...p} d="M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z M2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5 M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5" />;
const CalendarIcon = (p) => <Icon {...p} d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z M16 2v4 M8 2v4 M3 10h18" />;
const CpuIcon = (p) => <Icon {...p} d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3" />;
const DollarIcon = (p) => <Icon {...p} d="M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;

const FIELD_ICONS = {
  CRIM: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  ZN: "M3 21h18 M5 21V7l8-4 8 4v14",
  INDUS: "M2 20h20 M5 20V8l3-3 3 3v12 M13 20V4l4 2 4-2v16",
  CHAS: "M2 12c2-4 6-4 10 0s8-4 10 0 M2 16c2-4 6-4 10 0s8-4 10 0",
  NOX: "M8 18c0-3.5 2-6 4-8 2 2 4 4.5 4 8 M12 2a10 10 0 100 20 10 10 0 000-20z",
  RM: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  AGE: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2",
  DIS: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z",
  RAD: "M22 12h-4l-3 9L9 3l-3 9H2",
  TAX: "M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  PTRATIO: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  B: "M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20",
  LSTAT: "M23 6l-9.5 9.5-5-5L1 18",
};

const FIELDS = [
  { key: "CRIM", label: "Crime rate", caption: "Per-capita crime index", min: 0, max: 40, step: 0.01, default: 3.5, unit: "index" },
  { key: "ZN", label: "Large-lot zoning", caption: "Residential land zoned for 25,000+ sq ft lots", min: 0, max: 100, step: 1, default: 12, unit: "%" },
  { key: "INDUS", label: "Industrial land", caption: "Non-retail business land share", min: 0, max: 28, step: 0.1, default: 9, unit: "%" },
  { key: "CHAS", label: "River adjacency", caption: "Property borders the Charles River", type: "toggle" },
  { key: "NOX", label: "Air quality", caption: "Nitric oxide concentration", min: 0.35, max: 0.9, step: 0.001, default: 0.55, unit: "ppm" },
  { key: "RM", label: "Rooms per home", caption: "Average number of rooms per dwelling", min: 3, max: 9, step: 0.1, default: 6.2, unit: "rooms" },
  { key: "AGE", label: "Property age", caption: "Share of homes built before 1940", min: 0, max: 100, step: 1, default: 65, unit: "%" },
  { key: "DIS", label: "Employment access", caption: "Weighted distance to employment centres", min: 1, max: 13, step: 0.1, default: 4, unit: "mi" },
  { key: "RAD", label: "Highway access", caption: "Index of accessibility to radial highways", min: 1, max: 24, step: 1, default: 5, unit: "index" },
  { key: "TAX", label: "Property tax", caption: "Full-value property tax rate", min: 150, max: 720, step: 1, default: 320, unit: "$/10k" },
  { key: "PTRATIO", label: "School ratio", caption: "Pupil-to-teacher ratio", min: 12, max: 22, step: 0.1, default: 18, unit: "ratio" },
  { key: "B", label: "Demographic index", caption: "Dataset B-variable index", min: 0, max: 400, step: 1, default: 380, unit: "index" },
  { key: "LSTAT", label: "Lower-status share", caption: "Population share in lower economic status", min: 1, max: 38, step: 0.1, default: 12, unit: "%" },
];

const buildDefaults = () => Object.fromEntries(FIELDS.map(f => [f.key, f.type === "toggle" ? 0 : f.default]));

function formatLakhs(v) {
  const num = Number(v);
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function App() {
  const [form, setForm] = useState(buildDefaults);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("predict");

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const r = await fetch(`${API}/predictions`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // Keep local history on fetch error
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const sample = () => {
    setForm({ CRIM: 0.27, ZN: 0, INDUS: 8.14, CHAS: 0, NOX: 0.538, RM: 6.98, AGE: 45.8, DIS: 4.09, RAD: 4, TAX: 307, PTRATIO: 21, B: 396.9, LSTAT: 5.64 });
    setPrediction(null);
    setError("");
  };

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setPrediction(null);
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => {
          const field = FIELDS.find(f => f.key === k);
          const num = Number(v);
          return [k, (v === "" || isNaN(num)) ? (field?.default ?? 0) : num];
        })
      );
      const r = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "The valuation service returned an error.");

      const medv = Number(data.predicted_MEDV);
      const safeMedv = Math.max(0.1, medv);
      const lakhs = (safeMedv * 1000 * USD_TO_INR) / 100000;
      const createdAt = new Date().toISOString();
      setPrediction({ lakhs, medv: safeMedv, createdAt });

      const newRecord = {
        id: data.id || `mem_${Date.now()}`,
        ...payload,
        predicted_MEDV: safeMedv,
        created_at: createdAt
      };
      setHistory(prev => [newRecord, ...prev.filter(x => x.id !== newRecord.id)]);
      fetchHistory();
    } catch (err) {
      setError(err instanceof TypeError ? "Prediction server is offline or unreachable. Please try again." : (err.message || "Calculation failed."));
    } finally {
      setLoading(false);
    }
  };

  const scale = prediction ? Math.min(100, Math.max(0, ((prediction.lakhs - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100)) : 0;
  const latest = history[0];
  const latestLakhs = latest && !isNaN(Number(latest.predicted_MEDV)) ? (Number(latest.predicted_MEDV) * 1000 * USD_TO_INR / 100000).toFixed(1) : null;
  const avg = useMemo(() => {
    if (!history.length) return null;
    const vals = history.map(x => Number(x.predicted_MEDV)).filter(Number.isFinite);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [history]);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div><strong>GDP</strong><span>Real Estate AI</span></div>
        </div>
        <div className="side-label">Workspace</div>
        <nav>
          <button className={active === "predict" ? "nav-item active" : "nav-item"} onClick={() => setActive("predict")}>
            <HomeIcon size={18} /> Valuation
          </button>
          <button className={active === "history" ? "nav-item active" : "nav-item"} onClick={() => setActive("history")}>
            <ClockIcon size={18} /> History
          </button>
        </nav>
        <div className="side-card">
          <div className="status-dot"></div>
          <div><b>Model online</b><small>FastAPI · scikit-learn</small></div>
        </div>
        <div className="sidebar-foot">
          <CpuIcon size={14} color="#5a7a6f" />
          <span style={{ marginLeft: 6 }}>GDP Real Estate · ML Valuation</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header className="topbar">
          <div>
            <p className="breadcrumb">WORKSPACE / {active.toUpperCase()}</p>
            <h1>{active === "predict" ? "Property valuation" : "Prediction history"}</h1>
          </div>
          <div className="top-actions">
            <span className="live"><i /> LIVE MODEL</span>
            <button className="icon-btn" onClick={fetchHistory} title="Refresh history">
              <RefreshIcon size={16} />
            </button>
          </div>
        </header>

        {active === "predict" ? (
          <>
            {/* Hero Card */}
            <section className="hero-card">
              <div className="hero-content">
                <span className="pill"><ZapIcon size={12} color="#d7f49c" /> AI-POWERED VALUATION</span>
                <h2>Estimate a property's<br /><em>market value.</em></h2>
                <p>Enter the property's site and neighbourhood characteristics. Our trained regression pipeline generates an estimated value in seconds.</p>
                <div className="hero-meta">
                  <span><CheckCircleIcon size={14} color="#a0d8a0" /> Instant scoring</span>
                  <span><LayersIcon size={14} color="#a0d8a0" /> 13 property factors</span>
                  <span><DatabaseIcon size={14} color="#a0d8a0" /> Saved to Database</span>
                </div>
              </div>
              <div className="hero-graphic">
                <div className="orbit orbit-1"></div>
                <div className="orbit orbit-2"></div>
                {/* 2D floating data nodes */}
                <div className="float-node node-1"></div>
                <div className="float-node node-2"></div>
                <div className="float-node node-3"></div>
                <div className="building">
                  <div className="roof"></div>
                  <div className="windows"><i /><i /><i /><i /><i /><i /></div>
                  <div className="door"></div>
                  {/* Chimney 2D element */}
                  <div className="chimney"></div>
                </div>
                <span className="graphic-tag tag-a"><CpuIcon size={10} color="#9bb1a9" /> 13 FEATURES</span>
                <span className="graphic-tag tag-b"><BarChartIcon size={10} color="#9bb1a9" /> ML MODEL</span>
              </div>
            </section>

            {/* Metrics */}
            <section className="metrics">
              <div>
                <div className="metric-inner">
                  <div>
                    <span>Total valuations</span>
                    <strong>{history.length}</strong>
                    <small>Saved predictions</small>
                  </div>
                  <div className="metric-icon"><BarChartIcon size={20} color="#0b8f67" /></div>
                </div>
              </div>
              <div>
                <div className="metric-inner">
                  <div>
                    <span>Latest estimate</span>
                    <strong>{latestLakhs ? `${latestLakhs}L` : "—"}</strong>
                    <small>Indian rupee equivalent</small>
                  </div>
                  <div className="metric-icon"><DollarIcon size={20} color="#0b8f67" /></div>
                </div>
              </div>
              <div>
                <div className="metric-inner">
                  <div>
                    <span>Model output</span>
                    <strong>{avg ? `$${avg.toFixed(1)}k` : "—"}</strong>
                    <small>Average MEDV</small>
                  </div>
                  <div className="metric-icon"><TrendingUpIcon size={20} color="#0b8f67" /></div>
                </div>
              </div>
            </section>

            {/* Form & Result Grid */}
            <div className="workspace-grid">
              <section className="panel form-panel">
                <div className="panel-heading">
                  <div><span className="section-kicker">PROPERTY PROFILE</span><h3>Tell us about the property</h3></div>
                  <button className="sample-btn" onClick={sample}><LayersIcon size={13} color="currentColor" /> Use sample data</button>
                </div>
                <form onSubmit={submit}>
                  <div className="field-grid">
                    {FIELDS.map((f, i) => {
                      const currentVal = form[f.key] ?? (f.type === "toggle" ? 0 : f.default);
                      const numVal = Number(currentVal);
                      const fillPct = Math.min(100, Math.max(0, ((numVal - f.min) / (f.max - f.min)) * 100));
                      return (
                        <div className="field" key={f.key}>
                          <div className="field-top">
                            <label>
                              <Icon d={FIELD_ICONS[f.key]} size={14} color="#0b8f67" className="field-icon" />
                              {f.label}
                            </label>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                          </div>
                          <p>{f.caption}</p>
                          {f.type === "toggle" ? (
                            <button type="button" className={`switch ${Number(currentVal) === 1 ? "on" : ""}`} onClick={() => handleChange(f.key, Number(currentVal) === 1 ? 0 : 1)}>
                              <i></i><span>{Number(currentVal) === 1 ? "Adjacent to river" : "Not adjacent"}</span>
                            </button>
                          ) : (
                            <div className="input-row">
                              <input type="range" min={f.min} max={f.max} step={f.step} value={currentVal} onChange={e => handleChange(f.key, e.target.value)} style={{ "--fill": `${fillPct}%` }} />
                              <div className="number-wrap"><input type="number" min={f.min} max={f.max} step={f.step} value={currentVal} onChange={e => handleChange(f.key, e.target.value)} /><small>{f.unit}</small></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="form-actions">
                    <button type="button" className="reset" onClick={() => { setForm(buildDefaults()); setPrediction(null); setError(""); }}>Reset</button>
                    <button className="predict-btn" disabled={loading}>
                      {loading ? "Analysing property…" : <><ZapIcon size={15} color="#fff" /> Generate valuation</>}
                    </button>
                  </div>
                </form>
              </section>

              <aside className="result-panel">
                <div className="result-header">
                  <span className="section-kicker">VALUATION OUTPUT</span>
                  <span className="secure"><ShieldIcon size={12} color="#4a7566" /> SECURE</span>
                </div>
                {error ? (
                  <div className="error-box"><b>Unable to calculate</b><p>{error}</p></div>
                ) : prediction ? (
                  <div className="valuation">
                    <div className="confidence"><span>MODEL ESTIMATE</span><b><CheckCircleIcon size={13} color="#0b8f67" /> READY</b></div>
                    <div className="price">₹{formatLakhs(prediction.lakhs)}<small>Lakhs</small></div>
                    <p className="sub">Estimated property value</p>
                    <div className="range">
                      <div className="range-line"><i style={{ width: `${scale}%` }}></i><b style={{ left: `${scale}%` }}></b></div>
                      <div><span>₹{SCALE_MIN}L</span><span>Indicative range</span><span>₹{SCALE_MAX}L</span></div>
                    </div>
                    <div className="detail"><span><BarChartIcon size={13} color="#76857f" /> Model MEDV</span><b>${prediction.medv.toFixed(2)}k</b></div>
                    <div className="detail"><span><CalendarIcon size={13} color="#76857f" /> Generated</span><b>{formatDate(prediction.createdAt)}</b></div>
                    <button className="new-btn" onClick={() => setPrediction(null)}><RefreshIcon size={14} color="#0b8f67" /> New valuation</button>
                  </div>
                ) : (
                  <div className="empty-result">
                    <div className="target"><TargetIcon size={28} color="#0b8f67" /></div>
                    <h3>Your estimate will appear here</h3>
                    <p>Complete the property profile and generate a valuation to see the model output.</p>
                    <div className="mini-list">
                      <span>01 <b>Input analysis</b></span>
                      <span>02 <b>ML inference</b></span>
                      <span>03 <b>Value conversion</b></span>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </>
        ) : (
          /* History */
          <section className="panel history-panel">
            <div className="panel-heading">
              <div><span className="section-kicker">AUDIT TRAIL</span><h3><ClockIcon size={18} color="#0b8f67" /> Recent valuations</h3></div>
              <span className="history-count">{history.length} records</span>
            </div>
            {historyLoading ? <div className="history-empty">Loading saved valuations…</div> : history.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Created</th><th>Rooms</th><th>Crime</th><th>Tax</th><th>MEDV</th><th>INR estimate</th></tr>
                  </thead>
                  <tbody>
                    {history.map((x, i) => (
                      <tr key={x.id ?? i}>
                        <td>{formatDate(x.created_at)}</td>
                        <td>{Number(x.RM || 0).toFixed(2)}</td>
                        <td>{Number(x.CRIM || 0).toFixed(2)}</td>
                        <td>{Number(x.TAX || 0).toFixed(0)}</td>
                        <td>${Number(x.predicted_MEDV || 0).toFixed(2)}k</td>
                        <td><b>₹{formatLakhs(Number(x.predicted_MEDV || 0) * 1000 * USD_TO_INR / 100000)}L</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="history-empty">
                <div className="target"><DatabaseIcon size={28} color="#0b8f67" /></div>
                <h3>No valuations yet</h3>
                <p>Your completed predictions will be stored here in database history.</p>
              </div>
            )}
          </section>
        )}
        <footer>GDP Real Estate AI · Educational machine-learning application · Estimates are model outputs, not professional property appraisals.</footer>
      </main>
    </div>
  );
}

export default App;
