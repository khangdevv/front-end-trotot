import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Image as ImageIcon,
  Star,
  Send,
  MessageSquare,
  Heart,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { useRoomDetail } from "../../hooks/useRoomDetail";
import { useRoomReviews } from "../../hooks/useRoomReviews";
import { useSavedPosts } from "../../hooks/useSavedPosts";
  import StarPicker from "../../components/room/StarPicker";
  import ReviewItem from "../../components/room/ReviewItem";
  import RoomMap from "../../components/room/RoomMap";
  import RoomPrice from "../../components/room/RoomPrice";

/**
 * Room Detail Page - Displays detailed information about a room
 * This is a refactored version that uses custom hooks and extracted components
 */
export default function RoomDetailPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  
  // Use custom hooks for data fetching
  const { room, isLoading: isLoadingRoom } = useRoomDetail(roomId);
  const { reviews, isLoading: isLoadingReviews, submitReview } = useRoomReviews(roomId);
  const { isSaved, saveCount, toggleSave, isLoading: isLoadingSave } = useSavedPosts(roomId, user);

  // UI state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Handle save post with animation
  const handleToggleSave = async () => {
    await toggleSave();
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    setSubmitError("");
    if (myRating === 0) {
      setSubmitError("Vui lòng chọn số sao đánh giá!");
      return;
    }
    if (!myComment.trim()) {
      setSubmitError("Vui lòng nhập nội dung nhận xét!");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview(myRating, myComment, user);
      setSubmitSuccess(true);
      setMyRating(0);
      setMyComment("");
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError("Không thể gửi đánh giá. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : null;

  const canReview = user && user.role !== "LANDLORD";

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy phòng</h2>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const images =
    room.images && room.images.length > 0
      ? room.images.map((img) => img.url || img.imageUrl)
      : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200"];

  const landlord = room.user || {};
  const fullAddressString = [room.address, room.ward, room.district, room.city]
    .filter(Boolean)
    .join(", ");
  const latitude = Number(room.latitude);
  const longitude = Number(room.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapTarget = hasCoordinates ? `${latitude},${longitude}` : fullAddressString;
  const hasMapTarget = !!mapTarget;
  const destinationParam = encodeURIComponent(mapTarget);
  const embedMapSrc = hasMapTarget
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapTarget)}&z=15&output=embed`
    : "";

  const handleOpenMaps = () => {
    if (!hasMapTarget) {
      alert("Địa chỉ hoặc tọa độ của phòng này chưa được cập nhật trên hệ thống!");
      return;
    }
    setIsGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${destinationParam}`,
            "_blank",
          );
        },
        (error) => {
          setIsGettingLocation(false);
          console.warn("Không lấy được GPS:", error.message);
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}`,
            "_blank",
          );
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setIsGettingLocation(false);
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}`,
        "_blank",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Quay lại</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div className="relative h-[400px] md:h-[500px] bg-gray-100 rounded-2xl overflow-hidden">
              <img
                src={images[activeImageIndex]}
                alt={room.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                {room.status === "ACTIVE" && (
                  <span className="bg-green-500 px-3 py-1 text-xs font-bold text-white rounded shadow-md">
                    Đang cho thuê
                  </span>
                )}
              </div>
              <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2 text-white text-sm backdrop-blur-sm">
                <ImageIcon className="w-4 h-4" />
                <span>
                  {activeImageIndex + 1} / {images.length}
                </span>
              </div>
            </div>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-32 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx
                        ? "border-blue-500 scale-105"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Room Details */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold border border-blue-200">
                  {room.roomType || "Phòng Trọ"}
                </span>
                <span className="text-gray-500 font-semibold text-sm">
                  Đăng lúc:{" "}
                  {room.createdAt
                    ? new Date(room.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Gần đây"}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
                {room.title}
              </h1>

              <div className="flex items-start gap-3 text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[15px] font-medium leading-relaxed">
                  {fullAddressString || room.location?.address || "Chưa cập nhật địa chỉ"}
                </p>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                Thông tin mô tả
              </h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-8">
                {room.description || "Chủ trọ chưa cập nhật mô tả chi tiết."}
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                Tiện ích kèm theo
              </h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {room.amenities && room.amenities.length > 0 ? (
                  room.amenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {amenity.type || amenity.name || amenity}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-sm">
                    Không có tiện ích nào được liệt kê.
                  </p>
                )}
              </div>

              {/* Reviews Section */}
              <div className="border-t border-gray-100 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-bold text-gray-900">Đánh Giá Từ Người Thuê</h3>
                  </div>
                  {avgRating && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-extrabold text-amber-600 text-lg">{avgRating}</span>
                      <span className="text-gray-400 text-sm">/ 5</span>
                      <span className="text-gray-400 text-xs">({reviews.length} lượt)</span>
                    </div>
                  )}
                </div>

                {/* Review Form */}
                {!user ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center mb-6">
                    <Star className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                    <p className="text-blue-700 font-semibold mb-1">Đăng nhập để gửi đánh giá</p>
                    <p className="text-blue-500 text-sm">
                      Chia sẻ trải nghiệm của bạn về phòng trọ này
                    </p>
                  </div>
                ) : canReview ? (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
                    <p className="text-sm font-bold text-gray-700 mb-3">Đánh giá của bạn:</p>

                    <div className="flex items-center gap-3 mb-4">
                      <StarPicker value={myRating} onChange={setMyRating} size="w-8 h-8" />
                      <span className="text-sm text-gray-500 font-medium">
                        {myRating === 0 && "Chọn số sao"}
                        {myRating === 1 && "😞 Rất tệ"}
                        {myRating === 2 && "😕 Tệ"}
                        {myRating === 3 && "😐 Bình thường"}
                        {myRating === 4 && "😊 Tốt"}
                        {myRating === 5 && "🤩 Tuyệt vời!"}
                      </span>
                    </div>

                    <textarea
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      placeholder="Chia sẻ nhận xét của bạn về phòng trọ này (vị trí, chủ trọ, tiện nghi...)"
                      rows={3}
                      maxLength={500}
                      className="w-full border border-blue-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white placeholder-gray-400"
                    />
                    <div className="flex items-center justify-between mt-1 mb-3">
                      <span className="text-xs text-gray-400">{myComment.length}/500 ký tự</span>
                      {submitError && (
                        <span className="text-xs text-red-500 font-medium">{submitError}</span>
                      )}
                    </div>

                    {submitSuccess && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Đánh giá của bạn đã được gửi thành công!
                      </div>
                    )}

                    <button
                      onClick={handleSubmitReview}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-[0_4px_14px_0_rgba(37,99,235,0.3)] active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Gửi Đánh Giá
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 text-center text-sm text-gray-500 italic">
                    Chủ trọ không thể gửi đánh giá cho bài viết.
                  </div>
                )}

                {/* Reviews List */}
                {isLoadingReviews ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="ml-2 text-sm text-gray-500">Đang tải đánh giá...</span>
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {reviews.map((review, idx) => (
                      <ReviewItem key={review.id || idx} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Star className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="font-medium">Chưa có đánh giá nào</p>
                    <p className="text-sm">Hãy là người đầu tiên đánh giá phòng trọ này!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Price & Contact */}
          <div className="space-y-6">
            {/* Save Button */}
            {user?.role === "LANDLORD" ? (
              <div className="w-full flex items-center justify-center gap-4 py-5 px-6 rounded-2xl border-2 border-rose-100 bg-rose-50">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 fill-rose-400 text-rose-400" />
                </div>
                <div>
                  <p className="text-3xl font-black text-rose-500 leading-none">
                    {saveCount !== null ? saveCount : "--"}
                  </p>
                  <p className="text-xs font-semibold text-rose-400 uppercase tracking-wide mt-0.5">
                    Người đã lưu bài
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleToggleSave}
                disabled={isLoadingSave}
                className={`w-full flex items-center justify-center gap-3 font-bold py-4 px-6 rounded-2xl border-2 transition-all duration-300 shadow-sm ${
                  isSaved
                    ? "bg-rose-500 border-rose-500 text-white shadow-rose-500/30 hover:bg-rose-600"
                    : "bg-white border-gray-200 text-gray-600 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50"
                }`}
              >
                <Heart className={`w-6 h-6 transition-all duration-300 ${isSaved ? "fill-white text-white" : ""}`} />
                <span className="text-base">{isSaved ? "❤️ Đã lưu bài viết" : "Lưu bài viết"}</span>
              </button>
            )}

            {/* Price Box */}
            <RoomPrice room={room} avgRating={avgRating} reviewCount={reviews.length} />

            {/* Landlord Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Thông tin liên hệ
              </h3>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 overflow-hidden">
                  {landlord.avatar ? (
                    <img src={landlord.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-blue-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {landlord.fullName || landlord.name || "Chủ Trọ Ẩn Danh"}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold uppercase border border-blue-100">
                      {landlord.role === "LANDLORD" ? "CHỦ TRỐ" : landlord.role || "THÀNH VIÊN"}
                    </span>
                    {landlord.plan && landlord.plan !== "FREE" && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs font-bold uppercase border border-amber-200">
                        {landlord.plan}
                      </span>
                    )}
                    {(landlord.isVerified || landlord.is_verified) && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-bold border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" /> Đã xác minh
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => alert("Đang gọi cho: " + (landlord.fullName || "Chủ trọ"))}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-[0_4px_14px_0_rgba(34,197,94,0.39)]"
              >
                <Phone className="w-5 h-5" />
                {landlord.phone || "09xxxx.xxxx (Chạm để gọi)"}
              </button>
            </div>

            {/* Google Maps */}
            <RoomMap
              address={fullAddressString}
              latitude={latitude}
              longitude={longitude}
              onOpenMaps={handleOpenMaps}
              isGettingLocation={isGettingLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}