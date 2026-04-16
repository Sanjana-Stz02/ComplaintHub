import { useState } from "react";

export default function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-accordion">
      {items.map((item, index) => {
        const isOpen = index === openIndex;
        return (
          <div key={item.q} className={`faq-row${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className="faq-trigger"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
            >
              <span>{item.q}</span>
              <span className="faq-chevron" aria-hidden="true">{isOpen ? "\u2013" : "+"}</span>
            </button>
            {isOpen ? <div className="faq-answer">{item.a}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
