import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";
import MainLayout from "./components/layout/MainLayout";
import HomePage from "./pages/main/HomePage";
import RoomDetailPage from "./pages/main/RoomDetailPage";
import AuthPage from "./pages/main/AuthPage";
import AddRoomPage from "./pages/main/AddRoomPage";
import MyPostsPage from "./pages/main/MyPostsPage";
import SavedPostsPage from "./pages/main/SavedPostsPage";
import EditProfilePage from "./pages/main/EditProfilePage";
import PurchasePlanPage from "./pages/main/PurchasePlanPage";
import VerificationPage from "./pages/main/VerificationPage";
import AdminApp from "./pages/admin/AdminApp";

/**
 * Main App Component with React Router configuration
 * Refactored to use routing instead of modal-based navigation
 */
export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Main routes with layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="room/:id" element={<RoomDetailPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="add-room" element={<AddRoomPage />} />
            <Route path="add-room/:postId" element={<AddRoomPage />} />
            <Route path="my-posts" element={<MyPostsPage />} />
            <Route path="saved-posts" element={<SavedPostsPage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="pricing" element={<PurchasePlanPage />} />
            <Route path="verification" element={<VerificationPage />} />
          </Route>

          {/* Admin routes - separate layout */}
          <Route path="/admin/*" element={<AdminApp />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}