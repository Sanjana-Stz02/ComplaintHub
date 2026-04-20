export default function CategoryReportsChart({ reports }) {
  if (!reports || reports.length === 0) {
    return null;
  }

  const maxTotal = Math.max(...reports.map((r) => r.total), 1);

  return (
    <div className="category-chart">
      <div className="category-chart-title">Complaints by category</div>
      <ul className="category-chart-list">
        {reports.map((report) => {
          const widthPct = Math.max(4, Math.round((report.total / maxTotal) * 100));
          return (
            <li key={report.category} className="category-chart-row">
              <div className="category-chart-label">{report.category}</div>
              <div className="category-chart-bar-wrap">
                <div className="category-chart-bar" style={{ width: `${widthPct}%` }}>
                  <span className="category-chart-count">{report.total}</span>
                </div>
              </div>
              <div className="category-chart-resolution">
                {report.resolutionRate}% resolved
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
