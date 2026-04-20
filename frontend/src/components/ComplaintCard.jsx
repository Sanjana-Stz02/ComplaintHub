import ComplaintsMap from "./ComplaintsMap.jsx";
import InlineComments from "./InlineComments.jsx";
import {
  deadlineBadge,
  formatDate,
  formatDateShort,
  priorityClass,
  statusClass
} from "../utils/format";

export default function ComplaintCard({
  complaint,
  currentUser,
  expandedCommentId,
  onToggleDiscussion,
  onTrack,
  showDiscussion = true,
  extraBadges = null,
  children
}) {
  const hasMapLocation =
    complaint.location &&
    typeof complaint.location.lat === "number" &&
    typeof complaint.location.lng === "number";
  const badge = deadlineBadge(complaint.deadline);
  const isExpanded = expandedCommentId === complaint.complaintId;

  return (
    <article className="history-item">
      <div className="history-topline">
        <strong>{complaint.complaintId}</strong>
        <div className="history-top-pills">
          <span className={statusClass(complaint.status)}>{complaint.status}</span>
          <span className={priorityClass(complaint.priority)}>{complaint.priority}</span>
          {badge ? <span className={badge.className}>{badge.label}</span> : null}
          <span className={complaint.isArchived ? "archive-pill archived" : "archive-pill active-archive"}>
            {complaint.isArchived ? "Archived" : "Active"}
          </span>
          {extraBadges}
        </div>
      </div>
      <div className="history-title">{complaint.title}</div>
      {complaint.description ? <div className="small">{complaint.description}</div> : null}
      <div className="small muted">
        Category: {complaint.category || "Other"}
        {complaint.deadline ? ` \u00b7 Deadline: ${formatDateShort(complaint.deadline)}` : ""}
      </div>
      <div className="small muted">
        Submitted by: {complaint.citizenId?.fullName || complaint.submittedBy}
      </div>
      {complaint.assignedTo ? (
        <div className="small muted">
          Assigned to: {complaint.assignedTo.fullName} ({complaint.assignedTo.role})
        </div>
      ) : null}
      <div className="small muted">Created: {formatDate(complaint.createdAt)}</div>

      {children}

      {hasMapLocation ? (
        <div className="history-item-map">
          <div className="small history-item-map-label">Location</div>
          <ComplaintsMap complaints={[complaint]} variant="mini" />
        </div>
      ) : null}

      {showDiscussion && currentUser ? (
        <div className="card-actions">
          <button
            type="button"
            className="secondary-button card-action-btn"
            onClick={() => onToggleDiscussion?.(complaint.complaintId)}
          >
            {isExpanded ? "Hide discussion" : "Open discussion"}
          </button>
          {onTrack ? (
            <button
              type="button"
              className="secondary-button card-action-btn"
              onClick={() => onTrack(complaint.complaintId)}
            >
              Track details
            </button>
          ) : null}
        </div>
      ) : null}

      {isExpanded ? (
        <InlineComments complaintId={complaint.complaintId} currentUser={currentUser} />
      ) : null}
    </article>
  );
}
