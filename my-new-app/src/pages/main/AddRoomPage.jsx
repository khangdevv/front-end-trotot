import { useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import {
  ImagePlus, MapPin, Home, DollarSign, Maximize2,
  AlignLeft, CheckCircle2, Loader2, FileText, Info, ArrowLeft
} from "lucide-react";

const ROOM_TYPES = [
  { value: "PHONG_TRO_GAC", label: "Phòng trọ có gác" },
  { value: "PHONG_TRO",     label: "Phòng trọ" },
  { value: "CHUNG_CU_MINI", label: "Chung cư mini" },
  { value: "NHA_NGUYEN_CAN",label: "Nhà nguyên căn" },
  { value: "PHONG_GEP",     label: "Phòng ghép" },
  { value: "KI_TUC_XA",     label: "Ký túc xá" },
];

const AMENITIES = [
  { icon: "❄️", label: "Máy lạnh" },
  { icon: "🧊", label: "Tủ lạnh" },
  { icon: "🚿", label: "Vệ sinh riêng" },
  { icon: "🛏️", label: "Giường" },
  { icon: "📶", label: "Wifi" },
  { icon: "🫧", label: "Máy giặt" },
  { icon: "🏍️", label: "Chỗ để xe" },
  { icon: "🍳", label: "Bếp" },
  { icon: "🛗", label: "Thang máy" },
  { icon: "🕐", label: "Tự do giờ giấc" },
  { icon: "🪑", label: "Tủ đồ" },
  { icon: "📺", label: "Tivi" },
];

const SectionTitle = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-cyan-600" />
    </div>
    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{children}</h3>
  </div>
);

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>}
    {children}
  </div>
);

const inputCls = "w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all";

/**
 * Add Room Page - Create or edit room post
 * Refactored from AddRoomForm modal to page
 */
export default function AddRoomPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const isEditMode = !!postId;
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [existingPost, setExistingPost] = useState(null);

  // Fetch existing post if in edit mode
  useState(() => {
    if (isEditMode && postId) {
      const fetchPost = async () => {
        try {
          const token = localStorage.getItem("userToken");
          const response = await axios.get(`/api/posts/${postId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const post = response.data;
          setExistingPost(post);
          setImagePreviews(post.images?.map(img => img.url || img.imageUrl).filter(Boolean) || []);
          setSelectedAmenities(post.amenities?.map(a => a.type || a.name || a).filter(Boolean) || []);
        } catch (err) {
          setError("Không thể tải thông tin bài đăng!");
        }
      };
      fetchPost();
    }
  });

  const parseStreetAddress = (fullAddr, ward, district, city) => {
    if (!fullAddr) return "";
    let street = fullAddr;
    [city, district, ward].forEach(part => {
      if (part && street.endsWith(", " + part)) {
        street = street.slice(0, -(part.length + 2));
      } else if (part && street.endsWith("," + part)) {
        street = street.slice(0, -(part.length + 1));
      }
    });
    return street.trim();
  };

  const _ward     = existingPost?.ward     || existingPost?.location?.ward     || "";
  const _district = existingPost?.district || existingPost?.location?.district || "";
  const _city     = existingPost?.city     || existingPost?.location?.city     || "";

  const [formData, setFormData] = useState({
    title:       existingPost?.title || "",
    description: existingPost?.description || "",
    address:     (_ward || _district || _city)
                   ? parseStreetAddress(existingPost?.address || "", _ward, _district, _city)
                   : (existingPost?.address || ""),
    ward:        _ward,
    district:    _district,
    city:        _city,
    price:       existingPost?.price?.toString() || "",
    area:        existingPost?.area?.toString() || "",
    roomType:    existingPost?.roomType || "PHONG_TRO_GAC",
  });

  const remaining   = user?.remainingPosts ?? 0;
  const isExhausted = !isEditMode && remaining <= 0;

  const toggleAmenity = (label) =>
    setSelectedAmenities(prev =>
      prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
    );

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    setImagePreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isExhausted) { setError("Bạn đã hết lượt đăng bài. Vui lòng nâng cấp gói!"); return; }
    setError(""); setLoading(true);

    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("Vui lòng đăng nhập để đăng bài.");

      const fullAddress = [formData.address, formData.ward, formData.district, formData.city]
        .map(p => p?.trim()).filter(Boolean).join(", ");

      const qp = new URLSearchParams();
      qp.append("title", formData.title);
      qp.append("description", formData.description);
      qp.append("address", fullAddress);
      qp.append("ward", formData.ward);
      qp.append("district", formData.district);
      qp.append("city", formData.city);

      let lat = Number.isFinite(existingPost?.latitude) ? existingPost.latitude : null;
      let lng = Number.isFinite(existingPost?.longitude) ? existingPost.longitude : null;
      if ((lat == null || lng == null) && fullAddress) {
        try {
          const GOONG_KEY = import.meta.env.VITE_GOONG_API_KEY;
          if (GOONG_KEY?.trim()) {
            const gr = await axios.get(
              `https://rsapi.goong.io/geocode?address=${encodeURIComponent(fullAddress)}&api_key=${GOONG_KEY.trim()}`,
              { timeout: 3000 },
            );
            if (gr.data?.results?.length > 0) {
              lat = gr.data.results[0].geometry.location.lat;
              lng = gr.data.results[0].geometry.location.lng;
            }
          }

          if (lat == null || lng == null) {
            const nr = await axios.get(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`,
              { headers: { "Accept-Language": "vi-VN" }, timeout: 2500 },
            );
            if (nr.data?.length > 0) {
              lat = nr.data[0].lat;
              lng = nr.data[0].lon;
            }
          }
        } catch {
          // Geocoding is optional on FE. Skip lat/lng when providers are slow or unavailable.
        }
      }

      if (lat != null && lng != null) {
        qp.append("latitude", String(lat));
        qp.append("longitude", String(lng));
      }
      qp.append("price", formData.price.replace(/,/g, ""));
      qp.append("area", formData.area);
      qp.append("roomType", formData.roomType);
      selectedAmenities.forEach(a => qp.append("amenities", a));

      const data = new FormData();
      images.forEach(f => data.append("images", f));

      if (isEditMode) {
        await axios.put(`/api/posts/${existingPost.id}?${qp.toString()}`, data, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
      } else {
        await axios.post(`/api/posts?${qp.toString()}`, data, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        updateUser({ remainingPosts: remaining - 1 });
      }

      setSuccess(true);
      setTimeout(() => navigate("/my-posts"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Đã có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 text-center animate-[fadeUp_0.4s_ease-out]">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">{isEditMode ? "Cập nhật thành công!" : "Đăng tin thành công!"}</h2>
        <p className="text-gray-600 text-sm">{isEditMode ? "Bài đăng của bạn đã được cập nhật." : "Tin đăng của bạn đã được ghi nhận và đang chờ duyệt."}</p>
        <p className="text-xs text-gray-500 mt-3">Đang chuyển hướng...</p>
      </div>
      <style dangerouslySetInnerHTML={{__html:`@keyframes fadeUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Quay lại</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              {isEditMode ? "Sửa bài đăng" : "Đăng tin phòng mới"}
            </h1>
            <p className="text-gray-600">
              {isEditMode ? "Cập nhật thông tin bài đăng của bạn" : "Điền đầy đủ thông tin để tiếp cận sinh viên"}
            </p>
          </div>

          {/* POST QUOTA BANNER */}
          {!isEditMode && (
            <div className={`mb-6 rounded-xl px-4 py-3 flex items-center gap-3 border ${
              isExhausted
                ? "bg-rose-500/10 border-rose-500/30"
                : remaining <= 3
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-cyan-50 border-cyan-200"
            }`}>
              <Info className={`w-4 h-4 shrink-0 ${isExhausted ? "text-rose-400" : remaining <= 3 ? "text-amber-400" : "text-gray-500"}`} />
              <div className="flex-1 text-sm">
                {isExhausted ? (
                  <span className="text-rose-400 font-semibold">Bạn đã hết lượt đăng bài! Nâng cấp gói để tiếp tục.</span>
                ) : (
                  <span className={remaining <= 3 ? "text-amber-300" : "text-gray-400"}>
                    Lượt đăng còn lại:{" "}
                    <strong className={remaining <= 3 ? "text-amber-500" : "text-cyan-700"}>{remaining}</strong>
                  </span>
                )}
              </div>
              <div className="w-24 h-1.5 bg-white/80 border border-gray-200 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    isExhausted ? "bg-rose-500" : remaining <= 3 ? "bg-amber-400" : "bg-cyan-500"
                  }`}
                  style={{ width: remaining > 0 ? "50%" : "0%" }}
                />
              </div>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6 shadow-sm">

            {/* Thông tin cơ bản */}
            <div>
              <SectionTitle icon={Home}>Thông tin cơ bản</SectionTitle>
              <div className="space-y-3">
                <Field>
                  <input type="text" name="title" required value={formData.title}
                    onChange={handleChange} placeholder="Tiêu đề bài đăng (VD: Phòng trọ giá rẻ quận 1...)"
                    className={inputCls} />
                </Field>
                <Field label="Loại phòng">
                  <select name="roomType" required value={formData.roomType}
                    onChange={handleChange}
                    className={inputCls}>
                    {ROOM_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* Địa chỉ */}
            <div>
              <SectionTitle icon={MapPin}>Địa chỉ</SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Field>
                    <input type="text" name="city" required value={formData.city}
                      onChange={handleChange} placeholder="Thành phố" className={inputCls} />
                  </Field>
                  <Field>
                    <input type="text" name="district" required value={formData.district}
                      onChange={handleChange} placeholder="Quận/Huyện" className={inputCls} />
                  </Field>
                  <Field>
                    <input type="text" name="ward" required value={formData.ward}
                      onChange={handleChange} placeholder="Phường/Xã" className={inputCls} />
                  </Field>
                </div>
                <Field>
                  <input type="text" name="address" required value={formData.address}
                    onChange={handleChange} placeholder="Số nhà, tên đường..."
                    className={inputCls} />
                </Field>
              </div>
            </div>

            {/* Chi tiết phòng */}
            <div>
              <SectionTitle icon={DollarSign}>Chi tiết phòng</SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Giá thuê (VNĐ/tháng)">
                    <div className="relative">
                      <input type="number" name="price" required value={formData.price}
                        onChange={handleChange} placeholder="VD: 3000000"
                        className={`${inputCls} pr-12`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">VNĐ</span>
                    </div>
                  </Field>
                  <Field label="Diện tích (m²)">
                    <div className="relative">
                      <input type="number" name="area" required value={formData.area}
                        onChange={handleChange} placeholder="VD: 20"
                        className={`${inputCls} pr-10`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">m²</span>
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* Tiện ích */}
            <div>
              <SectionTitle icon={CheckCircle2}>Tiện ích sẵn có</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map(({ icon, label }) => {
                  const active = selectedAmenities.includes(label);
                  return (
                    <button key={label} type="button" onClick={() => toggleAmenity(label)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                        active
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-white border-gray-300 text-gray-600 hover:border-cyan-300 hover:text-cyan-700"
                      }`}>
                      <span>{icon}</span>
                      {label}
                      {active && <span className="ml-0.5 text-cyan-400">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mô tả */}
            <div>
              <SectionTitle icon={AlignLeft}>Mô tả chi tiết</SectionTitle>
              <textarea name="description" required rows={4} value={formData.description}
                onChange={handleChange} placeholder="Mô tả chi tiết về phòng, khu vực xung quanh, nội quy..."
                className={`${inputCls} resize-none leading-relaxed`} />
            </div>

            {/* Hình ảnh */}
            <div>
              <SectionTitle icon={ImagePlus}>Hình ảnh phòng</SectionTitle>
              <label className={`flex flex-col items-center justify-center w-full min-h-[110px] border-2 rounded-xl cursor-pointer transition-all ${
                imagePreviews.length > 0
                  ? "border-cyan-500/40 bg-cyan-500/5"
                  : "border-gray-300 border-dashed bg-gray-50 hover:border-cyan-300 hover:bg-cyan-50/40"
              }`}>
                {imagePreviews.length > 0 ? (
                  <div className="flex gap-2 p-3 flex-wrap justify-center">
                    {imagePreviews.map((src, i) => (
                      <img key={i} src={src} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-300" />
                    ))}
                    <div className="h-16 w-16 rounded-lg border border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-xs">+Thêm</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-gray-600">
                    <ImagePlus className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm font-medium">Nhấn để chọn ảnh</p>
                    <p className="text-xs text-gray-500 mt-1">Có thể chọn nhiều ảnh cùng lúc</p>
                  </div>
                )}
                <input type="file" name="images" multiple accept="image/*"
                  onChange={handleImageChange} className="hidden" />
              </label>
              {imagePreviews.length > 0 && (
                <p className="text-xs text-cyan-400 font-medium mt-1.5 px-1">✓ Đã chọn {imagePreviews.length} ảnh</p>
              )}
            </div>

            {/* ERROR */}
            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex gap-3 pt-1 pb-2">
              <button type="button" onClick={() => navigate(-1)} disabled={loading}
                className="w-1/3 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-100 hover:text-gray-900 transition-all disabled:opacity-50">
                Huỷ
              </button>
              <button type="submit" disabled={loading || isExhausted}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                ) : isEditMode ? (
                  <><FileText className="w-4 h-4" /> Lưu thay đổi</>
                ) : (
                  <><FileText className="w-4 h-4" /> Đăng bài ngay</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}