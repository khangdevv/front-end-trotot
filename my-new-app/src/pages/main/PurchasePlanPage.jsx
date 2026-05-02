import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Crown, Sparkles, Calendar, Zap, ArrowLeft } from "lucide-react";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";

const PLANS = {
  PRO: {
    monthly: 100000,
    yearly: 900000,
    features: [
      { icon: "✅", text: "Cộng thêm <strong>30 lượt</strong> tạo bài mỗi tháng." },
      { icon: "✅", text: "Huy hiệu PRO nổi bật trên bài đăng." },
      { icon: "❌", text: "Đẩy bài tự động lên trang nhất.", disabled: true },
    ],
  },
  ULTRA: {
    monthly: 300000,
    yearly: 2700000,
    features: [
      { icon: "✅", text: "Lượt đăng bài: <strong>+100 Bài</strong> mỗi tháng." },
      { icon: "✅", text: 'Hiển thị "Chủ trọ xanh" ưu tiên tìm kiếm.' },
      { icon: "✅", text: "Theo dõi thống kê lượt xem phòng hàng ngày." },
    ],
  },
};

function formatVND(amount) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function getEmailFromToken(token) {
  try {
    if (!token) return "";
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return "";
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return payload.email || payload.sub || "";
  } catch {
    return "";
  }
}

/**
 * Purchase Plan Page - View and purchase subscription plans
 * Refactored from PurchasePlanModal to page
 */
export default function PurchasePlanPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isMonthly, setIsMonthly] = useState(true);
  const { user } = useUser();

  const handlePurchase = async (planId) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        alert("Vui lòng đăng nhập để mua gói!");
        setIsLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const tokenEmail = getEmailFromToken(token);
      const buyerEmail = user?.email || tokenEmail;
      if (!buyerEmail) {
        throw new Error("Không tìm thấy email tài khoản để tạo phiên thanh toán.");
      }
      const returnPath = window.location.pathname || "/";
      const returnUrl = `${window.location.origin}${returnPath}`;

      const subRes = await axios.post(
        "/api/subscriptions",
        {
          email: buyerEmail,
          planId: planId,
          isMonthly: isMonthly,
          returnUrl,
          cancelUrl: returnUrl,
        },
        { headers }
      );

      const payload = subRes.data?.result || subRes.data?.data || subRes.data;
      const paymentUrl =
        payload?.paymentUrl ||
        payload?.payment_url ||
        payload?.payUrl ||
        payload?.paymentLink ||
        payload?.payment?.url ||
        payload?.redirectUrl ||
        payload?.url ||
        payload?.checkoutUrl ||
        (typeof payload === "string" ? payload : null);

      if (paymentUrl) {
        const normalizedUrl = /^https?:\/\//i.test(paymentUrl)
          ? paymentUrl
          : `https://${paymentUrl}`;
        window.location.assign(normalizedUrl);
      } else {
        throw new Error(
          "Không nhận được URL thanh toán. Kiểm tra lại response Backend."
        );
      }
    } catch (err) {
      console.error("VNPay Error:", err);
      const msg =
        err.response?.data?.message || err.message || "Lỗi không xác định";
      alert(`❌ Lỗi thanh toán: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

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
              <h2 className="text-lg font-bold text-gray-900">Nâng cấp gói</h2>
              <p className="text-xs text-gray-500">Chọn gói phù hợp với nhu cầu của bạn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-3 text-[11px] font-semibold tracking-widest text-amber-700 uppercase rounded-full bg-amber-50 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5" /> Phiên bản giới hạn
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-2">
              Nâng tầm tin đăng của bạn
            </h1>
            <p className="max-w-xl mx-auto text-gray-600 font-medium">
              Tiếp cận sinh viên dễ dàng hơn bao giờ hết với lượt hiển thị vô tận.
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-2xl p-1">
              <button
                onClick={() => setIsMonthly(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isMonthly
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Theo tháng
              </button>
              <button
                onClick={() => setIsMonthly(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  !isMonthly
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Zap className="w-4 h-4" />
                Theo năm
                <span className="ml-1 text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                  -25%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PRO Plan */}
            <div className="relative flex flex-col p-5 bg-white rounded-2xl border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group">
              <div className="flex-1">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Crown className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-wide text-center">
                  PRO Plan
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {formatVND(isMonthly ? PLANS.PRO.monthly : PLANS.PRO.yearly)}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-6 text-center">
                  {isMonthly ? "/ tháng" : "/ năm (tiết kiệm " + formatVND(PLANS.PRO.monthly * 12 - PLANS.PRO.yearly) + ")"}
                </p>

                <ul className="text-left space-y-3 mb-6">
                  {PLANS.PRO.features.map((f, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2.5 text-sm ${f.disabled ? "opacity-40 text-gray-400" : "text-gray-700"}`}
                    >
                      <span className="shrink-0 mt-0.5">
                        {f.disabled ? (
                          <span className="w-5 h-5 text-gray-600">❌</span>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-amber-500" />
                        )}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: f.text }} />
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handlePurchase("PRO")}
                disabled={isLoading}
                className="w-full py-3 font-semibold text-white transition-all bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl hover:from-amber-500 hover:to-amber-400 hover:shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Đang xử lý..." : "Mua gói PRO ngay"}
              </button>
            </div>

            {/* ULTRA Plan */}
            <div className="relative flex flex-col p-5 bg-gradient-to-b from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200 hover:border-cyan-400 hover:shadow-xl transition-all duration-300 shadow-lg transform md:-translate-y-2 group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full text-[11px] font-bold text-white shadow-lg z-20 whitespace-nowrap">
                GÓI BEST SELLER
              </div>

              <div className="flex-1">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform group-hover:rotate-6">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 mb-2 uppercase tracking-wide">
                  ULTRA PRO
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-extrabold text-gray-900">
                    {formatVND(isMonthly ? PLANS.ULTRA.monthly : PLANS.ULTRA.yearly)}
                  </span>
                </div>
                <p className="text-blue-600 text-sm mb-6 text-center">
                  {isMonthly ? "/ tháng" : "/ năm (tiết kiệm " + formatVND(PLANS.ULTRA.monthly * 12 - PLANS.ULTRA.yearly) + ")"}
                </p>

                <ul className="text-left space-y-3 mb-6">
                  {PLANS.ULTRA.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: f.text }} />
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handlePurchase("ULTRA")}
                disabled={isLoading}
                className="w-full py-3 text-white font-bold transition-all bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Đang xử lý..." : "Mở Khoá Ultra Ngay"}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500">
            * Lượt đăng không có giá trị quy đổi thành tiền mặt. Áp dụng cho đến khi dùng hết.
          </div>
        </div>
      </div>
    </div>
  );
}