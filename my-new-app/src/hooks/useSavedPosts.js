import { useState, useEffect } from "react";
import axiosClient from "../utils/axiosClient";

/**
 * Custom hook to manage saved posts functionality
 * @param {string} roomId - The ID of the room
 * @param {Object} user - Current user object
 * @returns {Object} - { isSaved, saveCount, toggleSave, isLoading }
 */
export function useSavedPosts(roomId, user) {
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if post is saved
  const isPostSaved = (postId, userId) => {
    if (!postId || !userId) return false;
    try {
      const savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
      return savedPosts.some(
        (item) => item.postId === postId && item.userId === userId,
      );
    } catch {
      return false;
    }
  };

  // Initialize saved state
  useEffect(() => {
    if (!roomId) return;
    setIsSaved(isPostSaved(roomId, user?.id));
  }, [roomId, user?.id]);

  // Fetch save count for landlords
  useEffect(() => {
    if (!roomId || user?.role !== "LANDLORD") return;

    const fetchSaveCount = async () => {
      try {
        setIsLoading(true);
        const data = await axiosClient.get(`/api/saved-posts/count/${roomId}`);
        setSaveCount(typeof data === "number" ? data : (data?.count ?? null));
      } catch (err) {
        console.error("Error fetching save count:", err);
        setSaveCount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaveCount();
  }, [roomId, user?.role]);

  const toggleSave = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để lưu bài yêu thích!");
      return;
    }

    try {
      setIsLoading(true);
      const next = await axiosClient.post(`/api/saved-posts/toggle`, { postId: roomId });
      setIsSaved(next.isSaved);
      
      // Update localStorage
      try {
        const savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
        if (next.isSaved) {
          savedPosts.push({ postId: roomId, userId: user.id, savedAt: Date.now() });
        } else {
          const index = savedPosts.findIndex(
            (item) => item.postId === roomId && item.userId === user.id,
          );
          if (index > -1) savedPosts.splice(index, 1);
        }
        localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
      } catch (err) {
        console.error("Error updating localStorage:", err);
      }
    } catch (err) {
      console.error("Error toggling save:", err);
      alert("Không thể lưu bài viết. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return { isSaved, saveCount, toggleSave, isLoading };
}