import { useState } from "react";
import StarRating from "./StarRating.jsx";
import Icon from "./Icon.jsx";
import { submitComplaintFeedback } from "../api/complaintApi";
import { formatDate } from "../utils/format";

export default function FeedbackForm({ complaint, currentUser, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isOwner = currentUser
    && (complaint.citizenId?._id === currentUser.id || complaint.citizenId === currentUser.id);
  const alreadySubmitted = Boolean(complaint.feedback && complaint.feedback.rating);
  const canSubmit = isOwner && complaint.status === "Resolved" && !alreadySubmitted;

  if (alreadySubmitted) {
    return (
      <div className="feedback-card feedback-card-done">
        <div className="feedback-card-header">
          <Icon name="sparkle" size={16} />
          <strong>Feedback submitted</strong>
        </div>
        <StarRating value={complaint.feedback.rating} readOnly size={20} />
        {complaint.feedback.comment ? (
          <p className="feedback-comment">&ldquo;{complaint.feedback.comment}&rdquo;</p>
        ) : null}
        <div className="small muted">Submitted {formatDate(complaint.feedback.submittedAt)}</div>
      </div>
    );
  }

  if (!canSubmit) {
    return null;
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
      setRating(0);
      setComment("");
      onSubmitted?.();
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
      <StarRating value={rating} onChange={setRating} size={28} />
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us what went well or what could be better (optional)"
        maxLength={1000}
      />
      {error ? <div className="error">{error}</div> : null}
      <div className="feedback-actions">
        <button type="submit" disabled={submitting || rating < 1}>
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}
