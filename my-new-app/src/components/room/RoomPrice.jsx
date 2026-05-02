import React from "react";
import PropTypes from "prop-types";
import { Star } from "lucide-react";

/**
 * Room price display component
 * @param {Object} props
 * @param {Object} props.room - Room object containing price, area, and other details
 * @param {number} props.avgRating - Average rating value
 * @param {number} props.reviewCount - Number of reviews
 */
function RoomPrice({ room, avgRating, reviewCount }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full pointer-events-none" />
      <p className="text-gray-500 font-medium mb-1">Giá thuê (VND/Tháng)</p>
      <h2 className="text-4xl font-black text-blue-600 mb-2">
        {room.price ? room.price.toLocaleString("vi-VN") : "Thoả thuận"}
      </h2>
      <div className="w-full h-px bg-gray-100 my-4" />
      <div className="flex justify-between items-center px-4">
        <span className="text-gray-600 font-medium">Diện tích:</span>
        <span className="text-xl font-bold text-gray-900">
          {room.area ? room.area + " m²" : "--"}
        </span>
      </div>
      {avgRating && (
        <div className="mt-3 flex justify-center">
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-amber-700 font-bold text-sm">{avgRating}</span>
            <span className="text-gray-400 text-xs">({reviewCount} đánh giá)</span>
          </div>
        </div>
      )}
    </div>
  );
}

RoomPrice.propTypes = {
  room: PropTypes.shape({
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    area: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  avgRating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  reviewCount: PropTypes.number,
};

export default RoomPrice;
