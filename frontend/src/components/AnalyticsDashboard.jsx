import Icon from "./Icon.jsx";

const formatHours = (hours) => {
  if (!hours && hours !== 0) return "—";
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

  return (
    <div className="analytics-dash">
      <div className="dashboard-grid dashboard-grid-4">
        <div className="dashboard-stat">
          <span className="stat-label">Total complaints</span>
          <strong>{totals.total}</strong>
          <div className="small muted">All time</div>
        </div>
        <div className="dashboard-stat">
          <span className="stat-label">Resolution rate</span>
          <strong>{totals.resolutionRate}%</strong>
          <div className="small muted">{totals.resolved} of {totals.total} resolved</div>
        </div>
        <div className="dashboard-stat">
          <span className="stat-label">Avg resolution time</span>
          <strong>{formatHours(totals.avgResolutionHours)}</strong>
          <div className="small muted">Submitted to resolved</div>
        </div>
        <div className="dashboard-stat">
          <span className="stat-label">Avg citizen rating</span>
          <strong>{totals.avgRating ? `${totals.avgRating} / 5` : "—"}</strong>
          <div className="small muted">{totals.feedbackCount} ratings</div>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-2" style={{ marginTop: "12px" }}>
        <div className={`dashboard-stat ${totals.active > 0 ? "" : ""}`}>
          <span className="stat-label">Active right now</span>
          <strong>{totals.active}</strong>
          <div className="small muted">Pending + Assigned + In Progress</div>
        </div>
        <div className={`dashboard-stat ${totals.overdue > 0 ? "dashboard-stat-alert" : ""}`}>
          <span className="stat-label">Overdue</span>
          <strong>{totals.overdue}</strong>
          <div className="small muted">Past deadline</div>
        </div>
      </div>

      <div className="analytics-section">
        <div className="section-heading">
          <div>
            <h4>Complaint volume (last 14 days)</h4>
            <p className="small muted">New complaints submitted each day.</p>
          </div>
          {onRefresh ? (
            <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          ) : null}
        </div>
        <div className="volume-chart">
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
        <h4>Worker performance</h4>
        <p className="small muted">Top workers by completed assignments.</p>
        {workerPerformance.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="users" size={22} /></div>
            <div className="empty-state-title">No workers yet</div>
            <div className="small muted">Assign complaints to workers or MPs to start collecting data.</div>
          </div>
        ) : (
          <div className="category-reports-table-wrap">
            <table className="category-reports-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Role</th>
                  <th>Total Assigned</th>
                  <th>Completed</th>
                  <th>Resolved</th>
                  <th>Avg Resolution</th>
                </tr>
              </thead>
              <tbody>
                {workerPerformance.map((w) => (
                  <tr key={w.workerId}>
                    <td><strong>{w.fullName}</strong></td>
                    <td><span className={`pill pill-role pill-role-${(w.role || "").toLowerCase()}`}>{w.role}</span></td>
                    <td>{w.total}</td>
                    <td>{w.completed}</td>
                    <td>{w.resolved}</td>
                    <td>{w.avgResolutionHours ? formatHours(w.avgResolutionHours) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
