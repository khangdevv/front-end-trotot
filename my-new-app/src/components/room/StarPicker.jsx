import React, { useState } from "react";
import PropTypes from "prop-types";
import { Star } from "lucide-react";

/**
 * Interactive star rating picker component
 * @param {Object} props
 * @param {number} props.value - Current rating value (1-5)
 * @param {Function} props.onChange - Callback when rating changes
 * @param {boolean} props.readonly - If true, stars cannot be clicked
 * @param {string} props.size - Tailwind size classes for the star icons
 */
function StarPicker({ value, onChange, readonly = false, size = "w-6 h-6" }) {
  const [hovered, setHovered] = useState(0);
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-transform ${!readonly ? "hover:scale-125 cursor-pointer" : "cursor-default"}`}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`${size} transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300 fill-gray-100"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

StarPicker.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  size: PropTypes.string,
};

export default StarPicker;
