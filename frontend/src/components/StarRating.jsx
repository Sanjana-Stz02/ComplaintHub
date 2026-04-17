import { useState } from "react";

export default function StarRating({ value = 0, onChange, readOnly = false, size = 22 }) {
  const [hover, setHover] = useState(0);
  const effective = hover || value;

  return (
    <div
      className={`star-rating${readOnly ? " read-only" : ""}`}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `Rating: ${value} out of 5` : "Rate this resolution"}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= effective;
        return (
          <button
            key={star}
            type="button"
            className={`star${active ? " active" : ""}`}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onMouseEnter={() => !readOnly && setHover(star)}
            onClick={() => !readOnly && onChange?.(star)}
            disabled={readOnly}
            style={{ width: size, height: size }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={active ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
