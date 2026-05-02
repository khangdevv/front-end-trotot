import axios from "axios";
import { useState, useActionState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useUser } from "../../contexts/UserContext";

const getTokenPayload = (token) => {
  if (!token) return {};
  try {
    const payloadBase64Url = token.split('.')[1];
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(payloadBase64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return {};
  }
};

/**
 * Authentication Page - Login and Register
 * Refactored from modal to page with routing support
 */
export default function AuthPage() {
  const { login } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'LOGIN';

  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState(mode);
  const [selectedRole, setSelectedRole] = useState("STUDENT");
  
  const selectedRoleRef = useRef(selectedRole);
  useEffect(() => {
    selectedRoleRef.current = selectedRole;
  }, [selectedRole]);

  // State cho luồng quên mật khẩu
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [state, formAction, isPending] = useActionState(
    async (prev, formData) => {
      const email = formData.get("email");
      const password = formData.get("password");
      const role = formData.get("role");

      // Validate phía client
      if (!email.endsWith("@gmail.com")) {
        return { error: "Email phải là địa chỉ Gmail (@gmail.com)!" };
      }

      if (view === "REGISTER") {
        const phone = formData.get("phone");
        if (!/^0\d{9}$/.test(phone)) {
          return { error: "Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số!" };
        }
        if (password !== formData.get("confirmPassword")) {
          return { error: "Mật khẩu xác nhận không khớp. Vui lòng thử lại!" };
        }
      }

      try {
        if (view === "LOGIN") {
          // --- ĐĂNG NHẬP ---
          const response = await axios.post("/auth/login", { email, password });
          const { token } = response.data;
          const payload = getTokenPayload(token);
          const backendRole = payload.role || response.data.role;
          
          // Kiểm tra xem backendRole có khớp với vai trò (Người thuê / Chủ trọ) đang tick không
          // (Bỏ qua kiểm tra nếu tài khoản là ADMIN hệ thống)
          if (backendRole && backendRole !== "ADMIN" && backendRole !== role) {
            const dbRoleName = backendRole === "LANDLORD" ? "Chủ trọ" : "Người thuê";
            return { error: `Sai vai trò! Tài khoản này là "${dbRoleName}". Vui lòng chọn đúng màn hình đăng nhập.` };
          }

          const userRole = backendRole || role; // Ưu tiên role từ DB
          const userName = payload.fullName || payload.full_name || payload.name || payload.sub?.split("@")[0] || email.split("@")[0];

          localStorage.setItem("userToken", token);
          try {
            const profileRes = await axios.get("/api/users/me", { headers: { Authorization: `Bearer ${token}` } });
            const u = profileRes.data?.result || profileRes.data?.data || profileRes.data;
            login({
              id: u.id,
              name: u.fullName || u.full_name || u.name || u.email?.split("@")[0],
              email: u.email,
              phone: u.phone,
              role: u.role,
              plan: u.plan,
              avatarUrl: u.avatar_url || u.avatarUrl || u.profilePicture || u.photo,
              isVerified: u.isVerified || u.is_verified || false,
              remainingPosts: u.remainingPosts ?? u.remaining_posts ?? null,
              token,
            });
          } catch (e) {
            login({ name: userName, role: userRole, token });
          }
          navigate("/");
          return { success: true };
        } else {
          // --- ĐĂNG KÝ ---
          const fullName = formData.get("fullName");
          const phone = formData.get("phone");
          await axios.post("/auth/register", {
            full_name: fullName, // Có thể backend dùng camelCase (fullName) hoặc snake_case (full_name)
            phone,
            email,
            password,
            role: role // Truyền rõ chữ LANDLORD hoặc STUDENT xuống database
          });
          // Tự động đăng nhập sau khi đăng ký thành công
          const loginRes = await axios.post("/auth/login", { email, password });
          const { token } = loginRes.data;
          const payload = getTokenPayload(token);
          const backendRole = payload.role || loginRes.data.role;
          
          const userRole = backendRole || role;
          const userName = payload.fullName || payload.full_name || payload.name || fullName;

          localStorage.setItem("userToken", token);
          try {
            const profileRes = await axios.get("/api/users/me", { headers: { Authorization: `Bearer ${token}` } });
            const u = profileRes.data?.result || profileRes.data?.data || profileRes.data;
            login({
              id: u.id,
              name: u.fullName || u.full_name || u.name || u.email?.split("@")[0],
              email: u.email,
              phone: u.phone,
              role: u.role,
              plan: u.plan,
              avatarUrl: u.avatar_url || u.avatarUrl || u.profilePicture || u.photo,
              isVerified: u.isVerified || u.is_verified || false,
              remainingPosts: u.remainingPosts ?? u.remaining_posts ?? null,
              token,
            });
          } catch (e) {
            login({ name: userName, role: userRole, token });
          }
          navigate("/");
          return { success: true };
        }
      } catch (error) {
        return { error: error.response?.data?.message ?? "Đã có lỗi xảy ra. Vui lòng thử lại!" };
      }
    },
    null,
  );

  // --- ĐĂNG NHẬP BẰNG GOOGLE ---
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setGoogleError("");
      try {
        // Gửi access_token lên backend để xác thực
        const response = await axios.post("/auth/login-google", {
          token: tokenResponse.access_token,
          role: selectedRoleRef.current, // Gửi role mong muốn lên kèm cho Backend (dành cho lần đầu đăng kí qua Google)
        });

        const { token, full_name, fullName, name, email } = response.data;
        const payload = getTokenPayload(token);
        const backendRole = payload.role || response.data.role;

        if (backendRole && backendRole !== "ADMIN" && backendRole !== selectedRoleRef.current) {
          const dbRoleName = backendRole === "LANDLORD" ? "Chủ trọ" : "Người thuê";
          throw new Error(`Sai vai trò! Tài khoản Google này là "${dbRoleName}". Vui lòng chọn đúng màn hình tiếp tục.`);
        }

        const userRole = backendRole || selectedRoleRef.current; // Ưu tiên role từ Database hơn
        const tokenEmail = payload.email || payload.sub || email;
        const userName = payload.fullName || payload.full_name || payload.name || full_name || fullName || name || tokenEmail?.split("@")[0] || "Người dùng Google";

        localStorage.setItem("userToken", token);
        try {
          const profileRes = await axios.get("/api/users/me", { headers: { Authorization: `Bearer ${token}` } });
          const u = profileRes.data?.result || profileRes.data?.data || profileRes.data;
          login({
            id: u.id,
            name: u.fullName || u.full_name || u.name || u.email?.split("@")[0],
            email: u.email,
            phone: u.phone,
            role: u.role,
            plan: u.plan,
            avatarUrl: u.avatar_url || u.avatarUrl || u.profilePicture || u.photo,
            isVerified: u.isVerified || u.is_verified || false,
            remainingPosts: u.remainingPosts ?? u.remaining_posts ?? null,
            token,
          });
        } catch (e) {
          login({ name: userName, role: userRole, token });
        }
        navigate("/");
      } catch (err) {
        setGoogleError(err.response?.data?.message ?? err.message ?? "Đăng nhập Google thất bại. Vui lòng thử lại!");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setGoogleError("Đã huỷ đăng nhập Google hoặc có lỗi xảy ra.");
    },
  });

  // --- LUỒNG QUÊN MẬT KHẨU ---

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      await axios.post("/auth/forgot-password", { email: forgotEmail });
      setOtp(["", "", "", "", "", ""]);
      setView("VERIFY_OTP");
    } catch (err) {
      setForgotError(err.response?.data?.message ?? "Không tìm thấy email. Vui lòng thử lại!");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setForgotError("Vui lòng nhập đủ 6 số mã OTP!");
      return;
    }
    setForgotLoading(true);
    try {
      await axios.post("/auth/verify-otp", { email: forgotEmail, otp: otpString });
      setView("RESET_PASSWORD");
    } catch (err) {
      setForgotError(err.response?.data?.message ?? "Mã OTP không đúng. Vui lòng kiểm tra lại!");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    const newPassword = e.target.newPassword.value;
    const confirmPassword = e.target.confirmPassword.value;
    if (newPassword !== confirmPassword) {
      setForgotError("Mật khẩu xác nhận không khớp!");
      return;
    }
    setForgotLoading(true);
    try {
      await axios.post("/auth/reset-password", { email: forgotEmail, newPassword });
      setForgotEmail("");
      setForgotError("");
      setView("LOGIN");
    } catch (err) {
      setForgotError(err.response?.data?.message ?? "Đặt lại mật khẩu thất bại. Vui lòng thử lại!");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px] rounded-[2rem] bg-white/95 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/50 relative my-auto">
        <button onClick={() => navigate("/")} className="absolute right-6 top-6 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 p-2.5 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div className="mb-6">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
            {view === "LOGIN" && "Đăng nhập"}
            {view === "REGISTER" && "Đăng ký"}
            {view === "FORGOT_PASSWORD" && "Quên mật khẩu"}
            {view === "VERIFY_OTP" && "Xác nhận OTP"}
            {view === "RESET_PASSWORD" && "Mật khẩu mới"}
          </h2>
          <div className="w-10 h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-400 rounded-full mt-4"></div>
        </div>

        {view === "FORGOT_PASSWORD" ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <p className="text-sm text-zinc-600 font-medium">Nhập email của bạn để nhận mã OTP 6 số.</p>
            <input type="email" value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }} placeholder="Email đăng ký của bạn" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
            {forgotError && <p className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{forgotError}</p>}
            <button disabled={forgotLoading} className="w-full rounded-2xl bg-zinc-900 mt-2 py-4 font-bold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2">{forgotLoading ? "ĐANG GỬI..." : "GỬI MÃ OTP"}</button>
            <button type="button" onClick={() => setView("LOGIN")} className="w-full text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors mt-2">Quay lại Đăng nhập</button>
          </form>
        ) : view === "VERIFY_OTP" ? (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <p className="text-sm text-zinc-600 font-medium">Mã OTP đã được gửi đến <span className="font-bold text-zinc-900">{forgotEmail}</span>.</p>
            <div className="flex justify-between gap-2 py-2">
              {otp.map((digit, idx) => (
                <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(e.target.value, idx)} onKeyDown={(e) => handleOtpKeyDown(e, idx)} className="w-12 h-14 rounded-xl border-2 border-zinc-200 bg-zinc-50/50 text-center text-xl font-black text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all" />
              ))}
            </div>
            {forgotError && <p className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{forgotError}</p>}
            <button disabled={forgotLoading} className="w-full rounded-2xl bg-zinc-900 mt-2 py-4 font-bold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2">{forgotLoading ? "ĐANG XÁC NHẬN..." : "XÁC NHẬN MÃ OTP"}</button>
            <button type="button" onClick={() => { setForgotError(""); setView("FORGOT_PASSWORD"); }} className="w-full text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors mt-2">Gửi lại mã OTP</button>
          </form>
        ) : view === "RESET_PASSWORD" ? (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <p className="text-sm text-zinc-600 font-medium mb-4">Mật khẩu mới phải từ 6 ký tự trở lên.</p>
            <input name="newPassword" type="password" placeholder="Mật khẩu mới" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
            <input name="confirmPassword" type="password" placeholder="Xác nhận mật khẩu" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
            {forgotError && <p className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{forgotError}</p>}
            <button disabled={forgotLoading} className="w-full rounded-2xl bg-zinc-900 mt-4 py-4 font-bold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 transition-all">{forgotLoading ? "ĐANG CẬP NHẬT..." : "ĐẶT LẠI MẬT KHẨU"}</button>
          </form>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 mt-4 mb-4 bg-zinc-100/80 p-1.5 rounded-[1.25rem]">
              <label className="flex cursor-pointer items-center justify-center rounded-xl py-3 px-4 font-bold text-sm transition-all bg-transparent text-zinc-500 hover:text-zinc-900 has-checked:bg-white has-checked:text-zinc-900 has-checked:shadow-sm">
                <input type="radio" name="role" value="STUDENT" checked={selectedRole === "STUDENT"} onChange={(e) => setSelectedRole(e.target.value)} className="hidden" /> Người thuê
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-xl py-3 px-4 font-bold text-sm transition-all bg-transparent text-zinc-500 hover:text-zinc-900 has-checked:bg-white has-checked:text-zinc-900 has-checked:shadow-sm">
                <input type="radio" name="role" value="LANDLORD" checked={selectedRole === "LANDLORD"} onChange={(e) => setSelectedRole(e.target.value)} className="hidden" /> Chủ trọ
              </label>
            </div>

            {view === "REGISTER" && (
              <>
                <input name="fullName" type="text" placeholder="Họ và tên" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
                <input name="phone" type="tel" placeholder="Số điện thoại (ví dụ: 098...)" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
              </>
            )}

            <input name="email" type="email" defaultValue="" placeholder="Email của bạn (@gmail.com)" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />

            <div className="relative group">
              <input name="password" type={showPassword ? "text" : "password"} defaultValue="" placeholder="Mật khẩu" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 pr-12 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors" title={showPassword ? "Ẩn" : "Hiện"}>
                {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>

            {view === "LOGIN" && (
              <div className="flex items-center justify-between px-2 mt-1">
                <a href="#" onClick={(e) => { e.preventDefault(); setView("FORGOT_PASSWORD"); }} className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">Quên mật khẩu?</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setView("REGISTER"); }} className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">Tạo tài khoản mới</a>
              </div>
            )}

            {view === "REGISTER" && (
              <div className="relative group">
                <input name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Xác nhận mật khẩu" required className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 pr-12 font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all" />
              </div>
            )}

            {state?.error && (
              <div className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {state.error}
              </div>
            )}

            <button disabled={isPending} className="w-full rounded-2xl bg-zinc-900 mt-6 py-4 font-bold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 hover:shadow-zinc-900/30 active:scale-[0.98] disabled:opacity-50 transition-all">{isPending ? "ĐANG XỬ LÝ..." : view === "LOGIN" ? "ĐĂNG NHẬP" : "HOÀN TẤT ĐĂNG KÝ"}</button>

            <div className="relative flex items-center py-4">
              <div className="grow border-t border-zinc-200" />
              <span className="mx-4 text-xs font-bold text-zinc-400 tracking-widest">HOẶC</span>
              <div className="grow border-t border-zinc-200" />
            </div>

            {googleError && <p className="text-sm font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">{googleError}</p>}
            <button type="button" onClick={() => { setGoogleError(""); handleGoogleLogin(); }} disabled={googleLoading} className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-zinc-100 bg-white py-3.5 font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-200 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm">
              {googleLoading ? "Đang kết nối..." : <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
              {!googleLoading && "Tiếp tục với Google"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}