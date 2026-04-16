import { useEffect, useRef, useState } from "react";
import { addComment, getComments } from "../api/complaintApi";
import { formatDate } from "../utils/format";

const MAX_LENGTH = 1000;

export default function InlineComments({ complaintId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loadedForId = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!complaintId || loadedForId.current === complaintId) {
      return undefined;
    }

    setLoading(true);
    setError("");
    loadedForId.current = complaintId;

    getComments(complaintId)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setComments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [complaintId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();

    if (!trimmed) {
      setError("Write something before posting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await addComment(complaintId, { userId: currentUser.id, text: trimmed });
      const refreshed = await getComments(complaintId);
      setComments(refreshed);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inline-comments">
      <div className="inline-comments-header small">
        <strong>Discussion</strong>
        <span>{comments.length} comment{comments.length === 1 ? "" : "s"}</span>
      </div>

      {loading ? (
        <div className="small muted">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="small muted">No comments yet. Start the discussion below.</div>
      ) : (
        <ul className="inline-comments-list">
          {comments.map((comment) => {
            const role = comment.authorRole || "User";
            return (
              <li key={comment._id} className="inline-comment">
                <div className="inline-comment-head">
                  <span className={`avatar avatar-${role.toLowerCase().replace(/\s+/g, "-")}`} aria-hidden="true">
                    {comment.authorName?.[0]?.toUpperCase() || "?"}
                  </span>
                  <div className="inline-comment-meta">
                    <div>
                      <strong>{comment.authorName}</strong>{" "}
                      <span className={`pill pill-role pill-role-${role.toLowerCase().replace(/\s+/g, "-")}`}>
                        {role}
                      </span>
                    </div>
                    <div className="small muted">{formatDate(comment.createdAt)}</div>
                  </div>
                </div>
                <div className="inline-comment-body">{comment.text}</div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="inline-comment-form">
        <textarea
          rows={2}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder={`Write a comment as ${currentUser?.role || "User"}\u2026`}
        />
        <div className="inline-comment-form-row">
          <span className="small muted">{text.length}/{MAX_LENGTH}</span>
          <button type="submit" disabled={submitting || !text.trim()}>
            {submitting ? "Posting\u2026" : "Post comment"}
          </button>
        </div>
      </form>

      {error ? <div className="error small">{error}</div> : null}
    </div>
  );
}
