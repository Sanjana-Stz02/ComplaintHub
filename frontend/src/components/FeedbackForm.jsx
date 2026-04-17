import { useState } from "react";
import StarRating from "./StarRating.jsx";
import Icon from "./Icon.jsx";
import { submitComplaintFeedback } from "../api/complaintApi";
import { formatDate } from "../utils/format";

const RATING_LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

export default function FeedbackForm({ complaint, currentUser, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isOwner = currentUser
    && (complaint.citizenId?._id === currentUser.id || complaint.citizenId === currentUser.id);
  const alreadySubmitted = Boolean(complaint.feedback && complaint.feedback.rating);
  const canSubmit = isOwner && complaint.status === "Resolved" && !alreadySubmitted;

  if (alreadySubmitted) {
    return (
      <div className="feedback-card feedback-card-done">
        <div className="feedback-card-header">
          <Icon name="check" size={16} />
          <strong>Thanks for your feedback</strong>
        </div>
        <div className="feedback-display">
          <StarRating value={complaint.feedback.rating} readOnly size={22} />
          <span className="feedback-rating-chip">
            {complaint.feedback.rating}/5 · {RATING_LABELS[complaint.feedback.rating] || ""}
          </span>
        </div>
        {complaint.feedback.comment ? (
          <blockquote className="feedback-comment">{complaint.feedback.comment}</blockquote>
        ) : null}
        <div className="small muted">Submitted {formatDate(complaint.feedback.submittedAt)}</div>
      </div>
    );
  }

  if (!canSubmit) {
    return null;
  }

  if (justSubmitted) {
    return (
      <div className="feedback-card feedback-card-done feedback-success">
        <div className="success-burst" aria-hidden="true">
          <Icon name="check" size={28} />
        </div>
        <strong>Thank you for your feedback!</strong>
        <div className="small muted">Your rating helps us improve the service.</div>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      await submitComplaintFeedback(complaint.complaintId, {
        userId: currentUser.id,
        rating,
        comment: comment.trim()
      });
      setJustSubmitted(true);
      setTimeout(() => {
        setJustSubmitted(false);
        setRating(0);
        setComment("");
        onSubmitted?.();
      }, 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="feedback-card" onSubmit={handleSubmit}>
      <div className="feedback-card-header">
        <Icon name="sparkle" size={16} />
        <strong>Rate this resolution</strong>
      </div>
      <p className="small muted">Your feedback helps us improve the service.</p>
      <div className="feedback-rating-row">
        <StarRating value={rating} onChange={setRating} size={30} />
        <span className={`feedback-rating-chip${rating > 0 ? " is-active" : ""}`}>
          {rating > 0 ? `${rating}/5 · ${RATING_LABELS[rating]}` : "Tap a star"}
        </span>
      </div>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us what went well or what could be better (optional)"
        maxLength={1000}
      />
      <div className="feedback-footer">
        <span className="small muted">{comment.length}/1000</span>
        {error ? <div className="error feedback-error">{error}</div> : null}
        <button type="submit" disabled={submitting || rating < 1}>
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Submitting…
            </>
          ) : (
            <>
              <Icon name="send" size={14} /> Submit feedback
            </>
          )}
        </button>
      </div>
    </form>
  );
}
