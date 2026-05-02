import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";
import {
  Upload, CheckCircle2, Clock, XCircle,
  ShieldCheck, AlertTriangle, Loader2, FileText, Image, ArrowLeft
} from "lucide-react";

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    label: "Đang chờ xử lý tự động...",
    desc: "Hệ thống AI đang xác minh CCCD của bạn"
  },
  PENDING_MANUAL: {
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    label: "Chờ admin xét duyệt",
    desc: "Hệ thống đã chuyển sang xét duyệt thủ công"
  },
  APPROVED: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    label: "Đã xác minh thành công ✅",
    desc: "Tài khoản của bạn đã được xác minh danh tính"
  },
  REJECTED: {
    icon: XCircle,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
    label: "Bị từ chối",
    desc: ""
  },
};

const UploadBox = ({ label, hint, value, onChange, loading }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
    <label className={`flex flex-col items-center justify-center w-full min-h-[120px] border-2 rounded-xl cursor-pointer transition-all ${
      value
        ? "border-violet-500/50 bg-violet-500/5"
        : "border-gray-700 border-dashed bg-gray-900/40 hover:border-gray-500 hover:bg-gray-900/60"
    } ${loading ? "opacity-50 pointer-events-none" : ""}`}>
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-xs text-gray-500">Đang upload...</p>
        </div>
      ) : value ? (
        <div className="flex flex-col items-center gap-2 py-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          <p className="text-xs text-emerald-400 font-semibold">Đã upload thành công</p>
          <p className="text-[10px] text-gray-600 px-3 text-center break-all">{value}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-gray-500">
          <Image className="w-8 h-8 text-gray-600" />
          <p className="text-sm font-medium">Nhấn để chọn ảnh</p>
          <p className="text-[11px] text-gray-600">{hint}</p>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
        disabled={loading}
      />
    </label>
  </div>
);

/**
 * Verification Page - Upload ID card for identity verification
 * Refactored from VerificationModal to page
 */
export default function VerificationPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const token = localStorage.getItem("userToken");

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [frontId, setFrontId] = useState("");
  const [backId, setBackId]   = useState("");
  const [note, setNote]       = useState("");

  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack]   = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  // Kiểm tra trạng thái xác minh hiện tại
  useEffect(() => {
    let isMounted = true;
    setStatus(null);
    setLoadingStatus(true);

    if (!token) {
      setLoadingStatus(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const meRes = await axios.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = meRes.data?.result || meRes.data?.data || meRes.data;
        const nextVerified = me?.isVerified || me?.is_verified || false;
        if (isMounted) {
          updateUser({ isVerified: nextVerified });
        }
        if (nextVerified) {
          if (isMounted) setStatus({ status: "APPROVED" });
          return;
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Không thể refresh profile xác minh:", err?.message);
        }
      }

      try {
        const res = await axios.get("/api/verifications/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!isMounted) return;
        const d = res.data?.result || res.data?.data || res.data;
        setStatus(d);
      } catch (err) {
        if (!isMounted) return;
        if (err.response?.status !== 404) {
          console.error("Lỗi lấy trạng thái xác minh:", err);
        }
      } finally {
        if (isMounted) setLoadingStatus(false);
      }
    };
    fetchStatus();
      
    return () => { isMounted = false; };
  }, [token, user?.id, user?.isVerified, updateUser]);

  const uploadFile = async (file, setId, setUploading) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/upload/verification", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const payload = res.data?.result || res.data?.data || res.data || {};
      const publicId =
        payload.public_id ||
        payload.publicId ||
        payload.id ||
        payload.fileId ||
        payload.secure_url;
      if (!publicId) throw new Error("Không nhận được public_id từ server");
      setId(publicId);
    } catch (err) {
      setError("Upload ảnh thất bại: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!frontId || !backId) {
      setError("Vui lòng upload đủ ảnh CCCD mặt trước và mặt sau!");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await axios.post("/api/verifications", {
        idCardFrontPublicId: frontId,
        idCardBackPublicId:  backId,
        idCardFrontId: frontId,
        idCardBackId: backId,
        frontImagePublicId: frontId,
        backImagePublicId: backId,
        note: note || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "";
      if (msg.toLowerCase().includes("already verified")) {
        setStatus({ status: "APPROVED" });
      } else {
        setError("Gửi thất bại: " + msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isUploading = uploadingFront || uploadingBack;

  // SUCCESS SCREEN
  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 bg-violet-500/10 rounded-full border border-violet-500/30 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-violet-400" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Đã gửi xác minh!</h2>
        <p className="text-gray-600 text-sm">Hệ thống AI đang xử lý. Bạn sẽ nhận email thông báo kết quả.</p>
        <button onClick={() => navigate(-1)} className="mt-6 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all">
          Đóng
        </button>
      </div>
    </div>
  );

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
              <h2 className="text-lg font-bold text-gray-900">Xác minh danh tính</h2>
              <p className="text-xs text-gray-500">Tăng độ tin cậy cho tài khoản</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 space-y-6">

              {/* Trạng thái hiện tại */}
              {loadingStatus ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra trạng thái...
                </div>
              ) : status ? (() => {
                const cfg = STATUS_CONFIG[status.status] || STATUS_CONFIG["PENDING"];
                const Icon = cfg.icon;
                return (
                  <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
                    <div>
                      <p className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {status.status === "REJECTED" ? (status.rejectReason || "Thông tin không hợp lệ") : cfg.desc}
                      </p>
                      {status.status === "APPROVED" && (
                        <p className="text-xs text-emerald-500 mt-1 font-semibold">
                          Danh tính: {status.extractedName} — {status.extractedIdNumber}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-gray-50 border-gray-200">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-gray-900">Chưa xác minh</p>
                    <p className="text-xs text-gray-500 mt-0.5">Upload ảnh CCCD để được xác minh danh tính</p>
                  </div>
                </div>
              )}

              {/* Chỉ hiện form nếu chưa APPROVED */}
              {(!status || status.status === "REJECTED") && (
                <>
                  <div className="h-px bg-gray-200" />

                  {/* Upload boxes */}
                  <UploadBox
                    label="📷 CCCD mặt trước *"
                    hint="Ảnh rõ nét, đủ 4 góc, không bị loá"
                    value={frontId}
                    loading={uploadingFront}
                    onChange={e => uploadFile(e.target.files[0], setFrontId, setUploadingFront)}
                  />
                  <UploadBox
                    label="📷 CCCD mặt sau *"
                    hint="Ảnh mặt sau của căn cước công dân"
                    value={backId}
                    loading={uploadingBack}
                    onChange={e => uploadFile(e.target.files[0], setBackId, setUploadingBack)}
                  />

                  {/* Ghi chú */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ghi chú thêm</label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Thông tin bổ sung (nếu có)..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Privacy notice */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <FileText className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Ảnh CCCD được mã hoá và lưu trữ bảo mật. Hệ thống tự động xoá ảnh sau 7 ngày xử lý. Thông tin chỉ dùng để xác minh danh tính.
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pb-2">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="w-1/3 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-100 hover:text-gray-900 transition-all"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || isUploading || !frontId || !backId}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                      ) : (
                        <><ShieldCheck className="w-4 h-4" /> Gửi xác minh</>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Nếu APPROVED hoặc PENDING → chỉ hiện nút đóng */}
              {status && (status.status === "APPROVED" || status.status === "PENDING" || status.status === "PENDING_MANUAL") && (
                <button onClick={() => navigate(-1)} className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-100 hover:text-gray-900 transition-all">
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}