import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import {
  Pencil, Trash2, ToggleLeft, ToggleRight,
  Loader2, AlertCircle, Home, RefreshCw, Eye, Heart, ArrowLeft
} from "lucide-react";

/**
 * My Posts Page - View and manage user's room posts
 * Refactored from MyPostsModal to page
 */
export default function MyPostsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [saveCounts, setSaveCounts] = useState({});

  useEffect(() => { fetchMyPosts(); }, []);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("userToken");
      const res = await axios.get(`/api/posts/my-posts?page=1&size=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = res.data?.content || res.data || [];
      const list = Array.isArray(raw) ? raw : [];
      setPosts(list);
      fetchSaveCounts(list, token);
    } catch {
      setError("Không thể tải danh sách bài đăng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSaveCounts = async (list, token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const counts = {};
    await Promise.allSettled(
      list.map(async (post) => {
        try {
          const res = await axios.get(`/api/saved-posts/count/${post.id}`, { headers });
          counts[post.id] = typeof res.data === "number" ? res.data : (res.data?.count ?? null);
        } catch {
          counts[post.id] = null;
        }
      })
    );
    setSaveCounts(counts);
  };

  const handleToggleStatus = async (post) => {
    const newStatus = post.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      setTogglingId(post.id);
      const token = localStorage.getItem("userToken");
      await axios.patch(`/api/posts/${post.id}/status?status=${newStatus}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: newStatus } : p))
      );
    } catch {
      alert("Lỗi khi đổi trạng thái. Vui lòng thử lại!");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      const token = localStorage.getItem("userToken");
      await axios.delete(`/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
    } catch {
      alert("Lỗi khi xóa bài đăng. Vui lòng thử lại!");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditPost = (post) => {
    navigate(`/add-room/${post.id}`);
  };

  const handleViewPost = (postId) => {
    navigate(`/room/${postId}`);
  };

  const getImageUrl = (post) =>
    post.images?.[0]?.url ||
    post.images?.[0]?.imageUrl ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400";

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
            <button
              onClick={fetchMyPosts}
              disabled={loading}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-40"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Bài đăng của tôi</h1>
            <p className="text-gray-600">
              {loading ? "Đang tải..." : `${posts.length} bài đăng`}
            </p>
          </div>

          {/* STATUS LEGEND */}
          <div className="mb-6 flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-400">Còn trống</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-xs text-gray-400">Đã cho thuê</span>
            </div>
            <span className="text-xs text-gray-500 ml-auto">Nhấn icon để đổi trạng thái</span>
          </div>

          {/* CONTENT */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl border border-gray-200">
                <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                <p className="text-sm text-gray-500">Đang tải bài đăng...</p>
              </div>
            ) : error ? (
              <div className="text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-500">
                <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-gray-400 mb-1">Bạn chưa có bài đăng nào</p>
                <p className="text-sm">Hãy đăng tin để tiếp cận khách thuê</p>
                <button
                  onClick={() => navigate("/add-room")}
                  className="mt-4 text-sm text-rose-400 hover:text-rose-300 font-semibold transition-colors"
                >
                  Đăng bài ngay →
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all group"
                >
                  {/* Thumbnail */}
                  <div
                    className="shrink-0 relative cursor-pointer group/thumb"
                    onClick={() => handleViewPost(post.id)}
                    title="Xem chi tiết bài đăng"
                  >
                    <img
                      src={getImageUrl(post)}
                      alt={post.title}
                      className="w-24 h-20 object-cover rounded-lg border border-gray-200 group-hover/thumb:opacity-80 transition-opacity"
                    />
                    <span className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${
                      post.status === "CLOSED" ? "bg-rose-400" : "bg-emerald-400"
                    }`} />
                    <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 bg-black/40 transition-opacity">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3
                        className="text-sm font-bold text-gray-900 line-clamp-1 mb-0.5 hover:text-rose-500 cursor-pointer transition-colors"
                        onClick={() => handleViewPost(post.id)}
                      >
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{post.address}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-bold text-rose-400">
                        {((post.price || 0) / 1_000_000).toFixed(1)}tr/tháng
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider ${
                        post.status === "CLOSED"
                          ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      }`}>
                        {post.status === "CLOSED" ? "Đã cho thuê" : "Còn trống"}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-rose-300 font-semibold ml-auto">
                        <Heart className="w-3 h-3 fill-rose-300" />
                        {saveCounts[post.id] !== undefined
                          ? (saveCounts[post.id] !== null ? saveCounts[post.id] : "--")
                          : <Loader2 className="w-3 h-3 animate-spin" />}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(post)}
                      disabled={togglingId === post.id}
                      title={post.status === "CLOSED" ? "Đánh dấu còn trống" : "Đánh dấu đã cho thuê"}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all disabled:opacity-50 active:scale-95 ${
                        post.status === "CLOSED"
                          ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                      }`}
                    >
                      {togglingId === post.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : post.status === "CLOSED" ? (
                        <ToggleLeft className="w-4 h-4" />
                      ) : (
                        <ToggleRight className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleEditPost(post)}
                      title="Sửa bài đăng"
                      className="p-2.5 rounded-xl border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-all active:scale-95"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setConfirmDeleteId(post.id)}
                      title="Xóa bài đăng"
                      className="p-2.5 rounded-xl border border-gray-700 text-gray-500 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE OVERLAY */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-2">Xóa bài đăng?</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Hành động này <strong className="text-red-400">không thể hoàn tác</strong>. Bài đăng và toàn bộ hình ảnh sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deletingId === confirmDeleteId && <Loader2 className="w-4 h-4 animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}