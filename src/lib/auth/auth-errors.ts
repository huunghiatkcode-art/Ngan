/**
 * Maps Supabase Auth errors to Vietnamese messages the user can act on.
 * Kept as a pure function so it can be unit tested without a network.
 */
export interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

export function mapAuthError(error: AuthErrorLike): string {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Email chưa được xác nhận. Hãy tắt \"Confirm email\" trong Supabase (Authentication → Sign In / Providers → Email) hoặc đăng ký lại bằng trang Đăng ký.";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "Email hoặc mật khẩu không đúng.";
  if (code === "email_address_invalid" || msg.includes("email address") && msg.includes("invalid"))
    return "Supabase từ chối địa chỉ email này (thường là email giả như example.com). Hãy dùng email thật, ví dụ Gmail.";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already been registered") || msg.includes("already registered"))
    return "Email này đã được đăng ký. Hãy đăng nhập.";
  if (code === "weak_password" || msg.includes("password should"))
    return "Mật khẩu quá yếu (tối thiểu 6 ký tự).";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error.status === 429)
    return "Thao tác quá nhanh, vui lòng thử lại sau ít phút.";
  if (code === "user_banned") return "Tài khoản đã bị khóa.";
  if (msg.includes("fetch failed") || msg.includes("network"))
    return "Không kết nối được tới Supabase. Kiểm tra NEXT_PUBLIC_SUPABASE_URL và mạng.";
  if (msg.includes("invalid api key") || msg.includes("apikey"))
    return "Khóa Supabase không hợp lệ. Kiểm tra NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.";
  return `Lỗi đăng nhập: ${error.message ?? "không xác định"}`;
}

/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
export function safeNextPath(next: FormDataEntryValue | string | null | undefined, fallback = "/teacher/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (!next.startsWith("/teacher")) return fallback;
  return next;
}
