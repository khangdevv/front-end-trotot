# Tổng quan Code Frontend (Đánh giá Clean Code)

Dựa trên việc đọc cấu trúc thư mục, tệp `package.json`, `App.jsx` và `RoomDetailModal.jsx`, tôi đã có cái nhìn tổng quan về kiến trúc và chất lượng code Frontend của dự án. 

Dưới đây là đánh giá chi tiết về mức độ "Clean" và các vấn đề cần phải điều chỉnh.

## 1. Đánh giá chung (Code hiện tại có Clean không?)

**Câu trả lời ngắn gọn:** Code hiện tại hoạt động được nhưng **chưa thực sự Clean** và **đang gặp vấn đề nghiêm trọng về kiến trúc (Anti-pattern)**. 

Codebase đang có xu hướng trở thành "Legacy Code" rất khó bảo trì nếu tiếp tục phát triển thêm tính năng. Cấu trúc hiện tại phù hợp với một prototype/demo nhỏ, nhưng với quy mô của một ứng dụng tìm phòng trọ thực tế, nó đang quá cồng kềnh.

## 2. Các vấn đề cốt lõi cần điều chỉnh

### 🔴 Vấn đề 1: Thiếu Routing (Hệ thống điều hướng)
- **Tình trạng:** Ứng dụng **không sử dụng React Router** (`react-router-dom` không có trong `package.json`). Thay vào đó, toàn bộ ứng dụng đang chạy trên một trang duy nhất (Single Page) và mọi màn hình khác (Đăng nhập, Chi tiết phòng, Thêm phòng, Trang cá nhân...) đều được hiển thị dưới dạng **Modal (Cửa sổ bật lên)** đè lên `App.jsx`.
- **Hệ quả:** 
  - Không thể chia sẻ link (ví dụ: không thể gửi link `/room/123` cho bạn bè vì URL không thay đổi).
  - Nút Back của trình duyệt không hoạt động đúng (nhấn Back sẽ thoát luôn web thay vì đóng Modal).
  - Tải toàn bộ component cùng một lúc gây nặng bộ nhớ.

### 🔴 Vấn đề 2: "God Component" (Component ôm đồm quá nhiều việc)
- **Tình trạng:** Tệp `App.jsx` dài gần 600 dòng. Tệp này đang quản lý tới hơn 20 state khác nhau (`searchTerm`, `filters`, `showAuth`, `rooms`, `currentPage`...).
- **Hệ quả:** Bất kỳ thay đổi nhỏ nào (như gõ phím vào thanh tìm kiếm) cũng có thể khiến toàn bộ ứng dụng bị render lại (re-render), làm giảm hiệu năng nghiêm trọng. Rất khó để debug xem lỗi xảy ra từ đâu.

### 🔴 Vấn đề 3: Modal quá lớn và phức tạp
- **Tình trạng:** Các file trong thư mục `src/modals` cực kỳ lớn. Ví dụ `RoomDetailModal.jsx` dài gần 800 dòng (33KB), `AuthPage.jsx` dài gần 400 dòng (23KB). Trong `RoomDetailModal.jsx` có chứa cả các component con định nghĩa nội tuyến (inline) như `StarPicker`, `ReviewItem`.
- **Hệ quả:** Vi phạm nguyên tắc Single Responsibility (Đơn trách nhiệm). Tệp code quá dài khiến việc đọc hiểu, sửa lỗi và làm việc nhóm (merge code) cực kỳ ám ảnh và dễ sinh ra conflict.

### 🔴 Vấn đề 4: Gọi API rải rác và lặp code
- **Tình trạng:** Các lệnh `axios.get`, `axios.post` xuất hiện ở khắp mọi nơi. Logic lấy token (`localStorage.getItem("userToken")`) và gắn vào Header được lặp đi lặp lại ở mọi component cần gọi API bảo mật.
- **Hệ quả:** Nếu sau này bạn đổi cách lưu token (ví dụ chuyển sang cookie), hoặc cần xử lý logic tự động refresh token khi hết hạn, bạn sẽ phải đi sửa thủ công ở hàng chục file khác nhau.

### 🟡 Vấn đề 5: Thiếu kiểm tra kiểu dữ liệu (PropTypes / TypeScript)
- **Tình trạng:** Cảnh báo Linting báo lỗi thiếu `PropTypes` thường xuyên xuất hiện do bạn truyền props giữa các component nhưng không khai báo kiểu dữ liệu.

---

## 3. Lộ trình Refactor (Đề xuất giải pháp)

Để dự án chuyên nghiệp hơn (rất quan trọng khi chấm điểm Đồ án Tốt nghiệp), tôi đề xuất lộ trình tái cấu trúc như sau:

### Giai đoạn 1: Thiết lập Routing & Layout
1. **Cài đặt thư viện:** `npm install react-router-dom`.
2. **Cấu trúc lại thư mục:** 
   - Biến các file trong `modals` thành các trang thực sự nằm trong thư mục `pages/`.
   - Ví dụ: `/login` (AuthPage), `/room/:id` (RoomDetail), `/post-room` (AddRoomForm).
3. **Tạo Root Layout:** Tách thanh `Navbar`, `Footer` và `SearchBar` ra khỏi `App.jsx` thành một Layout chung dùng cho các trang.

### Giai đoạn 2: Chuẩn hóa API Client (Centralized API)
1. **Tạo file `src/utils/axiosClient.js`:** Cấu hình một instance của axios.
2. Thiết lập **Interceptors**: Tự động đính kèm `Authorization: Bearer <token>` vào mọi request thay vì lấy token thủ công ở từng file. Tự động xử lý lỗi 401 (chưa xác thực).

### Giai đoạn 3: Tách nhỏ Component (Decomposition)
1. Trong file lớn như `RoomDetailModal.jsx`, tách `StarPicker`, `ReviewItem`, phần hiển thị Map, phần hiển thị giá... ra thành các component riêng rẽ lưu ở `src/components/room/`.
2. Chuyển logic gọi API (fetch room, submit review) ra các custom hooks (ví dụ: `useRoomDetail.js`).

### Giai đoạn 4: Fix Lint và Clean Code
1. Bổ sung `PropTypes` cho toàn bộ các component nhận props.
2. Tối ưu hóa các useEffect và useMemo để tránh re-render không cần thiết.

## Open Questions

Bạn có muốn bắt đầu thực hiện việc tái cấu trúc (Refactor) này không?
- Nếu **có**, tôi khuyên chúng ta nên đi từng bước nhỏ. Bắt đầu từ việc **Tạo `axiosClient`** (Giai đoạn 2) trước vì nó dễ làm và dọn dẹp được rất nhiều code thừa, sau đó tiến tới cài đặt **React Router** (Giai đoạn 1).
- Nếu **không**, bạn muốn tôi tập trung chỉnh sửa/fix lỗi cụ thể nào trên nền code hiện tại?
