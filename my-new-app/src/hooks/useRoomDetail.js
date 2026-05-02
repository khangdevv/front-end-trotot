import { useState, useEffect } from "react";
import axiosClient from "../utils/axiosClient";

/**
 * Custom hook to fetch room details
 * @param {string} roomId - The ID of the room to fetch
 * @returns {Object} - { room, isLoading, error, refetch }
 */
export function useRoomDetail(roomId) {
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoomDetail = async () => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await axiosClient.get(`/api/posts/${roomId}`);
      setRoom(data);
    } catch (err) {
      console.error("Lỗi lấy chi tiết phòng:", err);
      setError(err);
      alert(
        "Không thể tải thông tin phòng này. Báo lỗi: " +
          JSON.stringify(err.response?.data || err.message),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomDetail();
  }, [roomId]);

  return { room, isLoading, error, refetch: fetchRoomDetail };
}