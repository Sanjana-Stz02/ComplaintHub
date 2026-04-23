import { useEffect } from "react";
import Icon from "./Icon.jsx";

const TONE_ICONS = {
  success: "check",
  error: "alert",
  info: "sparkle"
};

export default function Toast({ message, tone = "info", onDismiss, duration = 3200 }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [message, onDismiss, duration]);

  if (!message) return null;

  return (
    <div className={`toast toast-${tone}`} role="status">
      <div className="toast-icon"><Icon name={TONE_ICONS[tone] || "sparkle"} size={16} /></div>
      <div className="toast-message">{message}</div>
      {onDismiss ? (
        <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </div>
  );
}
