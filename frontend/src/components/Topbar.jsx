import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import { formatDate } from "../utils/format";

const NOTIF_ICON = {
  status_change: "clock",
  assignment: "user",
  comment: "chat",
  progress_update: "check"
};

export default function Topbar({
  title,
  subtitle,
  user,
  unreadCount,
  showNotifications,
  notifications,
  onToggleNotifications,
  onCloseNotifications,
  onMarkNotificationRead,
  onMarkAllRead,
  onOpenMobileNav
}) {
  const notifRef = useRef(null);

  useEffect(() => {
    if (!showNotifications) {
      return undefined;
    }

    const handleClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        onCloseNotifications?.();
      }
    };

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [showNotifications, onCloseNotifications]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button icon-button-ghost topbar-menu"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="topbar-title-block">
          <h1 className="topbar-title">{title}</h1>
          {subtitle ? <p className="topbar-subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="topbar-right">
        <div className="notification-wrapper" ref={notifRef}>
          <button
            type="button"
            className="icon-button icon-button-ghost notification-trigger"
            onClick={onToggleNotifications}
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={showNotifications}
          >
            <Icon name="bell" size={20} />
            {unreadCount > 0 ? <span className="notif-dot" /> : null}
          </button>
          {showNotifications ? (
            <div className="notification-dropdown" role="dialog" aria-label="Notifications">
              <div className="notif-header">
                <div>
                  <strong>Notifications</strong>
                  {unreadCount > 0 ? (
                    <div className="small muted">{unreadCount} unread</div>
                  ) : (
                    <div className="small muted">All caught up</div>
                  )}
                </div>
                {unreadCount > 0 ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>
                    Mark all read
                  </button>
                ) : null}
              </div>
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Icon name="inbox" size={32} />
                  <div>You&apos;re all caught up</div>
                  <div className="small muted">New activity will appear here.</div>
                </div>
              ) : (
                <ul className="notif-list">
                  {notifications.map((notif) => (
                    <li
                      key={notif._id}
                      className={notif.isRead ? "notif-item read" : "notif-item unread"}
                      onClick={() => !notif.isRead && onMarkNotificationRead?.(notif._id)}
                    >
                      <div className={`notif-icon notif-icon-${notif.type}`} aria-hidden="true">
                        <Icon name={NOTIF_ICON[notif.type] || "bell"} size={14} />
                      </div>
                      <div className="notif-body">
                        <div className="notif-message">{notif.message}</div>
                        <div className="small muted">
                          {formatDate(notif.createdAt)} · {notif.complaintId}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {user ? (
          <div className="topbar-user">
            <div className={`avatar avatar-sm avatar-${user.role.toLowerCase().replace(/\s+/g, "-")}`}>
              {user.fullName?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="topbar-user-meta">
              <div className="topbar-user-name">{user.fullName}</div>
              <div className="topbar-user-role">{user.role}</div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
