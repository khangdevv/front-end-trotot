import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";
import { Camera, User, Phone, Mail, Lock, Trash2, ShieldAlert, Save, RotateCcw, Eye, EyeOff, ArrowLeft } from "lucide-react";

const PLAN_BADGE = {
  FREE:  { label: "FREE",  color: "bg-gray-100 text-gray-600 border-gray-300" },
  PRO:   { label: "PRO",   color: "bg-amber-50 text-amber-700 border-amber-300" },
  ULTRA: { label: "ULTRA", color: "bg-cyan-50 text-cyan-700 border-cyan-300" },
};

const InputField = ({ icon: Icon, label, note, ...props }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {label}
      {note && <span className="normal-case text-gray-500 font-normal">({note})</span>}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      )}
      <input
        className={`w-full bg-white border border-gray-300 rounded-xl py-3 pr-4 text-sm text-gray-800 placeholder-gray-400
          focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          ${Icon ? "pl-10" : "pl-4"}`}
        {...props}
      />
    </div>
  </div>
);

/**
 * Edit Profile Page - Update user profile information
 * Refactored from EditProfileModal to page
 */
export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [previewAvatar, setPreviewAvatar] = useState(user.avatarUrl || "");
  const [avatarBlob, setAvatarBlob] = useState(null);
  const fileInputRef = useRef(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const plan = PLAN_BADGE[user.plan] || PLAN_BADGE.FREE;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh hợp lệ!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => setAvatarBlob(blob), "image/jpeg", 0.7);
        setPreviewAvatar(canvas.toDataURL("image/jpeg", 0.7));
        setError("");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    const fd = new FormData(e.target);
    try {
      if (!user.id) throw new Error("Chưa có ID người dùng!");
      const token = user.token || localStorage.getItem("userToken");
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const apiFormData = new FormData();
      apiFormData.append("fullName", fd.get("fullName"));
      apiFormData.append("full_name", fd.get("fullName"));
      apiFormData.append("phone", fd.get("phone"));
      apiFormData.append("plan", user.plan || "FREE");
      apiFormData.append("password", fd.get("password")?.trim() || "");
      if (avatarBlob) {
        apiFormData.append("avatar", avatarBlob, "avatar.jpg");
        apiFormData.append("profilePicture", avatarBlob, "avatar.jpg");
        apiFormData.append("file", avatarBlob, "avatar.jpg");
      }

      const res = await axios.put(`/api/users/${user.id}`, apiFormData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      const d = res.data?.result || res.data?.data || res.data;
      updateUser({
        name: d.fullName || d.full_name || fd.get("fullName"),
        phone: d.phone || fd.get("phone"),
        avatarUrl: d.avatar_url || d.avatarUrl || d.profilePicture || d.photo || previewAvatar,
      });
      setSuccess(true);
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Cập nhật thất bại.";
      setError(typeof msg === "object" ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const token = user.token || localStorage.getItem("userToken");
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await axios.delete(`/api/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      logout();
      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xoá tài khoản!");
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Quay lại</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Hồ sơ cá nhân</h2>
              <p className="text-xs text-gray-500">Cập nhật thông tin tài khoản của bạn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-5">

              {/* DELETE CONFIRM */}
              {showDeleteConfirm ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-8 h-8 text-rose-400" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Xác nhận xoá?</h3>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    Toàn bộ dữ liệu cá nhân, tin đăng và lịch sử của bạn sẽ bị xoá <span className="text-rose-400 font-semibold">vĩnh viễn</span> và không thể khôi phục.
                  </p>
                  {error && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mb-4">{error}</div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setError(""); }}
                      disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
                    >
                      Huỷ bỏ
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all disabled:opacity-50"
                    >
                      {deleteLoading ? "Đang xoá..." : "Xoá tài khoản"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* AVATAR */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center">
                        {previewAvatar ? (
                          <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-gray-400">
                            {user.name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyan-500 hover:bg-cyan-400 rounded-full flex items-center justify-center shadow-lg transition-all"
                      >
                        <Camera className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name || "Chưa đặt tên"}</p>
                      <p className="text-xs text-gray-500 truncate mb-2">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${plan.color}`}>
                          {plan.label}
                        </span>
                        <span className="text-[10px] text-gray-600">{user.role || "TENANT"}</span>
                      </div>
                    </div>
                    {previewAvatar && previewAvatar !== user.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => { setPreviewAvatar(user.avatarUrl || ""); setAvatarBlob(null); }}
                        className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                        title="Hoàn tác"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* FIELDS */}
                  <InputField icon={Mail} label="Email" note="chỉ đọc"
                    disabled value={user.email || ""} />

                  <InputField icon={User} label="Họ và tên"
                    name="fullName" required
                    defaultValue={user.name || ""}
                    placeholder="Nhập họ và tên hiển thị" />

                  <InputField icon={Phone} label="Số điện thoại"
                    name="phone" type="tel"
                    defaultValue={user.phone || ""}
                    placeholder="Ví dụ: 0901234567" />

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Mật khẩu mới <span className="normal-case text-gray-500 font-normal">(tuỳ chọn)</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Bỏ trống nếu không muốn đổi"
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* MESSAGES */}
                  {error && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                      ⚠️ {error}
                    </div>
                  )}
                  {success && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center font-semibold">
                      ✅ Cập nhật thành công!
                    </div>
                  )}

                  {/* ACTIONS */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button" onClick={() => navigate(-1)} disabled={loading}
                      className="w-1/3 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-100 hover:text-gray-900 transition-all disabled:opacity-50"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit" disabled={loading}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xoá tài khoản vĩnh viễn
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}