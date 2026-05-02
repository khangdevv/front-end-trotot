import React from "react";
import PropTypes from "prop-types";
import { UserCircle } from "lucide-react";
import StarPicker from "./StarPicker";

/**
 * Component to display a single review
 * @param {Object} props
 * @param {Object} props.review - Review object containing user info, rating, and comment
 */
function ReviewItem({ review }) {
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white shadow-sm">
        {review.userAvatar ? (
          <img
            src={review.userAvatar}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <UserCircle className="w-6 h-6 text-blue-400" />
        )}
      </div>

      {/* Nội dung */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-bold text-gray-800 text-sm truncate">
            {review.userName || review.userFullName || "Người dùng ẩn danh"}
          </span>
          <span className="text-xs text-gray-400 shrink-0">
            {timeAgo(review.createdAt)}
          </span>
        </div>
        <StarPicker value={review.rating} readonly size="w-4 h-4" />
        {review.comment && (
          <p className="text-gray-600 text-sm mt-1.5 leading-relaxed break-words">
            {review.comment}
          </p>
        )}
      </div>
    </div>
  );
}

ReviewItem.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rating: PropTypes.number.isRequired,
    comment: PropTypes.string,
    userName: PropTypes.string,
    userFullName: PropTypes.string,
    userAvatar: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  }).isRequired,
};

export default ReviewItem;
