import { useState, useEffect } from "react";
import axiosClient from "../utils/axiosClient";

/**
 * Custom hook to fetch and manage room reviews
 * @param {string} roomId - The ID of the room
 * @returns {Object} - { reviews, isLoading, error, submitReview, refetch }
 */
export function useRoomReviews(roomId) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = async () => {
    if (!roomId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await axiosClient.get(`/api/posts/${roomId}/reviews`);
      // Backend có thể trả: array hoặc { content: [...] }
      const reviewsData = Array.isArray(data)
        ? data
        : data?.content || data?.data || [];
      setReviews(reviewsData);
    } catch (err) {
      console.warn("Không lấy được reviews từ API:", err.message);
      setError(err);
      // Fallback: lấy từ localStorage
      const stored = localStorage.getItem(`reviews_${roomId}`);
      if (stored) {
        try {
          setReviews(JSON.parse(stored));
        } catch (_) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitReview = async (rating, comment, user) => {
    const payload = { rating, comment: comment.trim() };

    try {
      const newReview = await axiosClient.post(`/api/posts/${roomId}/reviews`, payload);
      setReviews((prev) => [newReview, ...prev]);
      return { success: true, review: newReview };
    } catch (err) {
      console.warn("API lỗi, lưu review vào localStorage:", err.message);
      // Fallback: lưu vào localStorage
      const newReview = {
        id: `local_${Date.now()}`,
        rating,
        comment: comment.trim(),
        userName: user?.name || "Bạn",
        userAvatar: user?.avatarUrl || null,
        createdAt: new Date().toISOString(),
      };
      const updated = [newReview, ...reviews];
      setReviews(updated);
      try {
        localStorage.setItem(`reviews_${roomId}`, JSON.stringify(updated));
      } catch (_) {}
      return { success: true, review: newReview };
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [roomId]);

  return { reviews, isLoading, error, submitReview, refetch: fetchReviews };
}