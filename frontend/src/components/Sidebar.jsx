import Icon from "./Icon.jsx";

export default function Sidebar({ items, activeView, onSelect, user, onLogout, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside className={`sidebar${mobileOpen ? " sidebar-open" : ""}`} aria-label="Primary navigation">
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">
            <Icon name="check" size={20} strokeWidth={3} />
          </div>
          <div className="brand-text">
            <div className="brand-name">ComplaintHub</div>
            <div className="brand-tag">Civic Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => {
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item${isActive ? " active" : ""}`}
                onClick={() => {
                  onSelect(item.id);
                  onCloseMobile?.();
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon name={item.icon} size={18} />
                <span className="sidebar-item-label">{item.label}</span>
                {item.badge ? <span className="sidebar-item-badge">{item.badge}</span> : null}
              </button>
            );
          })}
        </nav>

        {user ? (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className={`avatar avatar-${user.role.toLowerCase().replace(/\s+/g, "-")}`}>
                {user.fullName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.fullName}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
              <button
                type="button"
                className="icon-button icon-button-ghost"
                aria-label="Log out"
                title="Log out"
                onClick={onLogout}
              >
                <Icon name="logout" size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      {mobileOpen ? <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" /> : null}
    </>
  );
}
