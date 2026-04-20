import { STATUS_STEPS, statusStepIndex } from "../utils/format";

export default function StatusTimeline({ status }) {
  if (status === "Rejected") {
    return (
      <div className="status-timeline status-timeline-rejected">
        <div className="status-timeline-label">Complaint Rejected</div>
      </div>
    );
  }

  const currentIndex = statusStepIndex(status);

  return (
    <div className="status-timeline" role="list" aria-label="Complaint progress">
      {STATUS_STEPS.map((step, index) => {
        const state =
          index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";

        return (
          <div key={step} className={`status-step status-step-${state}`} role="listitem">
            <div className="status-step-dot" aria-hidden="true">
              {state === "done" ? "\u2713" : index + 1}
            </div>
            <div className="status-step-label">{step}</div>
          </div>
        );
      })}
    </div>
  );
}
