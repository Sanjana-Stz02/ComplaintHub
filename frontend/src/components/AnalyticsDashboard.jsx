import Icon from "./Icon.jsx";
import StarRating from "./StarRating.jsx";

const formatHours = (hours) => {
  if (!hours && hours !== 0) return "—";
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
};

const formatDay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const STATUS_COLORS = {
  Pending: "var(--warning-500)",
  Assigned: "var(--purple-500)",
  "In Progress": "var(--info-500)",
  Resolved: "var(--success-500)",
  Rejected: "var(--danger-500)"
};

const PRIORITY_COLORS = {
  Low: "var(--ink-400)",
  Medium: "var(--brand-500)",
  High: "#f97316",
  Emergency: "var(--danger-500)"
};

function StatTile({ icon, label, value, hint, tone = "default", children }) {
  return (
    <div className={`stat-tile stat-tile-${tone}`}>
      <div className="stat-tile-icon"><Icon name={icon} size={18} /></div>
      <div className="stat-tile-body">
        <span className="stat-tile-label">{label}</span>
        <strong className="stat-tile-value">{value}</strong>
        {hint ? <div className="stat-tile-hint">{hint}</div> : null}
        {children}
      </div>
    </div>
  );
}

function ResolutionGauge({ value = 0 }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="resolution-gauge" role="img" aria-label={`Resolution rate: ${clamped}%`}>
      <svg viewBox="0 0 140 140" width="140" height="140">
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand-400)" />
            <stop offset="100%" stopColor="var(--brand-600)" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={radius} className="gauge-bg" />
        <circle
          cx="70" cy="70" r={radius}
          className="gauge-fg"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="72" textAnchor="middle" className="gauge-value">{clamped}%</text>
        <text x="70" y="92" textAnchor="middle" className="gauge-caption">resolved</text>
      </svg>
    </div>
  );
}

function HorizontalBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.max(2, Math.round((count / total) * 100)) : 0;
  return (
    <div className="analytics-bar-row">
      <div className="analytics-bar-label">{label}</div>
      <div className="analytics-bar-track">
        <div
          className="analytics-bar-fill"
          style={{ width: `${pct}%`, background: color || "var(--brand-500)" }}
        />
      </div>
      <div className="analytics-bar-count">{count}</div>
    </div>
  );
}

const MEDALS = ["gold", "silver", "bronze"];

export default function AnalyticsDashboard({ data, onRefresh, loading }) {
  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Icon name="chart" size={22} /></div>
        <div className="empty-state-title">{loading ? "Loading analytics…" : "No analytics available yet"}</div>
        <div className="small muted">Analytics populate as complaints are created and resolved.</div>
      </div>
    );
  }

  const {
    totals,
    statusBreakdown = [],
    priorityBreakdown = [],
    categoryBreakdown = [],
    volumeByDay = [],
    workerPerformance = []
  } = data;

  const statusTotal = statusBreakdown.reduce((sum, r) => sum + r.count, 0);
  const priorityTotal = priorityBreakdown.reduce((sum, r) => sum + r.count, 0);
  const categoryTotal = categoryBreakdown.reduce((sum, r) => sum + r.count, 0);
  const maxVolume = volumeByDay.reduce((max, d) => Math.max(max, d.count), 0);
  const avgVolume = volumeByDay.length > 0
    ? volumeByDay.reduce((sum, d) => sum + d.count, 0) / volumeByDay.length
    : 0;
  const avgLinePct = maxVolume > 0 ? (avgVolume / maxVolume) * 100 : 0;

  const last7 = volumeByDay.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const prev7 = volumeByDay.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
  const delta = last7 - prev7;
  const deltaPct = prev7 > 0 ? Math.round((delta / prev7) * 100) : (last7 > 0 ? 100 : 0);
  const deltaTone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="analytics-dash">
      <div className="stat-tile-grid">
        <StatTile icon="inbox" label="Total complaints" value={totals.total} hint="All time" tone="brand" />
        <StatTile
          icon="check"
          label="Resolution rate"
          value={`${totals.resolutionRate}%`}
          hint={`${totals.resolved} of ${totals.total} resolved`}
          tone="success"
        />
        <StatTile
          icon="clock"
          label="Avg resolution time"
          value={formatHours(totals.avgResolutionHours)}
          hint="Submitted → resolved"
          tone="info"
        />
        <StatTile
          icon="star"
          label="Citizen rating"
          value={totals.avgRating ? `${totals.avgRating} / 5` : "—"}
          tone="warning"
        >
          {totals.avgRating ? (
            <div className="stat-tile-extra">
              <StarRating value={Math.round(totals.avgRating)} readOnly size={14} />
              <span className="small muted">{totals.feedbackCount} rating{totals.feedbackCount === 1 ? "" : "s"}</span>
            </div>
          ) : (
            <div className="stat-tile-hint">No ratings yet</div>
          )}
        </StatTile>
      </div>

      <div className="analytics-hero">
        <div className="analytics-hero-left">
          <div className="hero-row">
            <ResolutionGauge value={totals.resolutionRate} />
            <div className="hero-legend">
              <div className="hero-legend-item">
                <span className="dot" style={{ background: "var(--success-500)" }} />
                <span>Resolved</span>
                <strong>{totals.resolved}</strong>
              </div>
              <div className="hero-legend-item">
                <span className="dot" style={{ background: "var(--info-500)" }} />
                <span>Active</span>
                <strong>{totals.active}</strong>
              </div>
              <div className="hero-legend-item">
                <span className="dot" style={{ background: "var(--danger-500)" }} />
                <span>Rejected</span>
                <strong>{totals.rejected}</strong>
              </div>
              <div className={`hero-legend-item${totals.overdue > 0 ? " is-alert" : ""}`}>
                <span className="dot" style={{ background: "var(--warning-500)" }} />
                <span>Overdue</span>
                <strong>{totals.overdue}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-hero-right">
          <div className="section-heading section-heading-tight">
            <div>
              <h4>Complaint volume</h4>
              <p className="small muted">
                Last 14 days · avg {avgVolume.toFixed(1)}/day
                <span className={`trend-chip trend-chip-${deltaTone}`} title="7-day change vs previous 7 days">
                  {delta > 0 ? "▲" : delta < 0 ? "▼" : "●"} {Math.abs(deltaPct)}% week
                </span>
              </p>
            </div>
            {onRefresh ? (
              <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            ) : null}
          </div>
          <div className="volume-chart">
            {avgVolume > 0 ? (
              <div
                className="volume-chart-avg"
                style={{ bottom: `calc(${avgLinePct}% + 26px)` }}
                aria-hidden="true"
              >
                <span>avg</span>
              </div>
            ) : null}
            {volumeByDay.map((d) => {
              const pct = maxVolume > 0 ? (d.count / maxVolume) * 100 : 0;
              return (
                <div key={d.date} className="volume-chart-col" title={`${d.date}: ${d.count}`}>
                  <div className="volume-chart-value">{d.count > 0 ? d.count : ""}</div>
                  <div
                    className="volume-chart-bar"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <div className="volume-chart-label">{formatDay(d.date)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-section">
          <h4>By status</h4>
          {statusBreakdown.length === 0 ? (
            <div className="small muted">No data</div>
          ) : (
            <div className="analytics-bars">
              {statusBreakdown.map((row) => (
                <HorizontalBar
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  total={statusTotal}
                  color={STATUS_COLORS[row.label]}
                />
              ))}
            </div>
          )}
        </div>

        <div className="analytics-section">
          <h4>By priority</h4>
          {priorityBreakdown.length === 0 ? (
            <div className="small muted">No data</div>
          ) : (
            <div className="analytics-bars">
              {priorityBreakdown.map((row) => (
                <HorizontalBar
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  total={priorityTotal}
                  color={PRIORITY_COLORS[row.label]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="analytics-section">
        <h4>By category</h4>
        {categoryBreakdown.length === 0 ? (
          <div className="small muted">No data</div>
        ) : (
          <div className="analytics-bars">
            {categoryBreakdown.map((row) => (
              <HorizontalBar
                key={row.label}
                label={row.label}
                count={row.count}
                total={categoryTotal}
              />
            ))}
          </div>
        )}
      </div>

      <div className="analytics-section">
        <div className="section-heading section-heading-tight">
          <div>
            <h4>Worker performance</h4>
            <p className="small muted">Top workers by completed assignments.</p>
          </div>
        </div>
        {workerPerformance.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="users" size={22} /></div>
            <div className="empty-state-title">No workers yet</div>
            <div className="small muted">Assign complaints to workers or leaders to start collecting data.</div>
          </div>
        ) : (
          <div className="category-reports-table-wrap">
            <table className="category-reports-table worker-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Worker</th>
                  <th>Role</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Completion rate</th>
                  <th>Avg resolution</th>
                </tr>
              </thead>
              <tbody>
                {workerPerformance.map((w, idx) => {
                  const rate = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0;
                  const medal = idx < 3 ? MEDALS[idx] : null;
                  return (
                    <tr key={w.workerId}>
                      <td>
                        <span className={`rank-badge${medal ? ` rank-${medal}` : ""}`}>
                          {medal ? <Icon name="trophy" size={14} /> : `#${idx + 1}`}
                        </span>
                      </td>
                      <td><strong>{w.fullName}</strong></td>
                      <td><span className={`pill pill-role pill-role-${(w.role || "").toLowerCase()}`}>{w.role}</span></td>
                      <td>{w.total}</td>
                      <td>{w.completed}</td>
                      <td>
                        <div className="resolution-bar-wrap">
                          <div className="resolution-bar" style={{ width: `${rate}%` }} />
                          <span>{rate}%</span>
                        </div>
                      </td>
                      <td>{w.avgResolutionHours ? formatHours(w.avgResolutionHours) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
