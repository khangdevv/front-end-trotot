import React from "react";
import PropTypes from "prop-types";
import { Navigation } from "lucide-react";

/**
 * Google Maps component for displaying room location
 * @param {Object} props
 * @param {string} props.address - Full address string
 * @param {number} props.latitude - Latitude coordinate
 * @param {number} props.longitude - Longitude coordinate
 * @param {Function} props.onOpenMaps - Callback when user clicks "Navigate" button
 * @param {boolean} props.isGettingLocation - Loading state for geolocation
 */
function RoomMap({ address, latitude, longitude, onOpenMaps, isGettingLocation }) {
  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const mapTarget = hasCoordinates ? `${latitude},${longitude}` : address;
  const hasMapTarget = !!mapTarget;
  const embedMapSrc = hasMapTarget
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapTarget)}&z=15&output=embed`
    : "";

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
        Vị trí trọ trên Bản Đồ
      </h3>

      <div className="w-full bg-slate-100 rounded-xl overflow-hidden border border-gray-200 flex-1 min-h-[220px] relative mb-4">
        {hasMapTarget ? (
          <iframe
            title="Google Map vi tri tro"
            src={embedMapSrc}
            className="w-full h-full min-h-[220px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="w-full h-full min-h-[220px] flex items-center justify-center text-center p-6">
            <p className="text-sm text-gray-400 italic">
              Chủ trọ chưa cập nhật địa chỉ/tọa độ trên hệ thống.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onOpenMaps}
        disabled={isGettingLocation || !hasMapTarget}
        className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition duration-200 ${
          hasMapTarget
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] active:scale-95 disabled:opacity-70 disabled:cursor-wait"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isGettingLocation ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Đang định vị của bạn...
          </>
        ) : (
          <>
            <Navigation className="w-5 h-5" />
            Dẫn đường tới đây (Google Maps)
          </>
        )}
      </button>
    </div>
  );
}

RoomMap.propTypes = {
  address: PropTypes.string,
  latitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  longitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onOpenMaps: PropTypes.func.isRequired,
  isGettingLocation: PropTypes.bool,
};

export default RoomMap;
