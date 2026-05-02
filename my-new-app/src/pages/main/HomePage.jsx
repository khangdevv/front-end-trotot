import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import Hero from "../../components/layout/Hero";
import SearchBar from "../../components/layout/SearchBar";
import RoomCard from "../../components/RoomCard";
import AddRoomCard from "../../components/AddRoomCard";
import { useNavigate } from "react-router-dom";

/**
 * Home Page - Main landing page with room listings
 * Extracted from App.jsx for better separation of concerns
 */
export default function HomePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    roomType: "",
    amenities: [],
  });
  const [isLocating, setIsLocating] = useState(false);
  const [searchRadius, setSearchRadius] = useState(4);
  const [rooms, setRooms] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState("/api/posts");
  const [currentParams, setCurrentParams] = useState({});
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const DEFAULT_PAGE_SIZE = 20;

  const { user } = useUser();

  const enforceAuth = (callback) => {
    if (!user) {
      navigate("/auth?mode=LOGIN");
      return;
    }
    return callback();
  };

  const extractList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.content)) return payload.data.content;
    if (Array.isArray(payload?.data?.result)) return payload.data.result;
    return [];
  };

  const parseMeta = (payload, currentPage, pageSize, currentItemsCount) => {
    const root = payload?.data || payload || {};
    const totalPagesRaw = root.totalPages ?? root.page?.totalPages;
    const totalPages = Number(totalPagesRaw);
    const hasTotalPages = Number.isFinite(totalPages) && totalPages > 0;
    const totalItems = root.totalElements ?? root.totalItems ?? root.page?.totalElements;

    const hasNextRaw = root.hasNext ?? root.page?.hasNext;
    const hasNextBoolean =
      typeof hasNextRaw === "boolean"
        ? hasNextRaw
        : root.last === false || root.page?.last === false;

    if (typeof hasNextBoolean === "boolean") {
      return { hasMore: hasNextBoolean, totalPages: hasTotalPages ? totalPages : undefined, totalItems };
    }

    if (hasTotalPages) {
      return { hasMore: currentPage < totalPages, totalPages, totalItems };
    }

    return { hasMore: currentItemsCount >= pageSize, totalPages: hasTotalPages ? totalPages : undefined, totalItems };
  };

  const mapPostToRoom = (p) => {
    let imgUrl =
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800";
    if (p.images && p.images.length > 0) {
      imgUrl = p.images[0].url || p.images[0].imageUrl || imgUrl;
    }

    return {
      id: p.id,
      title: p.title || "Phòng trọ",
      price: (p.price || 0) / 1000000,
      address: p.address || p.city || "Chưa cập nhật địa chỉ",
      tag: p.roomType || "",
      image: imgUrl,
      planType: p.userPlan || p.plan || (p.user && p.user.plan) || "FREE",
      isOwnerVerified: p.user?.isVerified || p.ownerVerified || false,
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
    };
  };

  const fetchPostsPage = useCallback(async ({
    endpoint,
    headers,
    params = {},
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  }) => {
    const query = new URLSearchParams({
      ...params,
      page: String(page),
      size: String(pageSize),
    });

    const res = await axios.get(`${endpoint}?${query.toString()}`, { headers });
    const items = extractList(res.data);
    const meta = parseMeta(res.data, page, pageSize, items.length);

    return { items, meta };
  }, [DEFAULT_PAGE_SIZE]);

  const loadRooms = useCallback(async ({
    endpoint,
    params = {},
    page = 1,
    retryWithoutToken = false,
  }) => {
    try {
      setIsLoadingRooms(true);

      const token = localStorage.getItem("userToken");
      const headers =
        token && !retryWithoutToken ? { Authorization: `Bearer ${token}` } : {};

      const { items, meta } = await fetchPostsPage({
        endpoint,
        headers,
        params,
        page,
      });

      const mappedRooms = items.map(mapPostToRoom);

      setRooms(mappedRooms);
      setCurrentPage(page);
      setTotalPages(meta.totalPages ?? 1);
      setTotalResults(meta.totalItems ?? mappedRooms.length);
      setHasMore(meta.hasMore);
      setCurrentEndpoint(endpoint);
      setCurrentParams(params);

      return { items: mappedRooms, meta };
    } catch (err) {
      if (err.response?.status === 401 && !retryWithoutToken) {
        return loadRooms({ endpoint, params, page, retryWithoutToken: true });
      }

      setRooms([]);
      setHasMore(false);
      setTotalPages(1);
      setTotalResults(0);

      console.error("Lỗi lấy bài đăng:", err);
      throw err;
    } finally {
      setIsLoadingRooms(false);
    }
  }, [fetchPostsPage]);

  useEffect(() => {
    const fetchRealPosts = async () => {
      try {
        await loadRooms({ endpoint: "/api/posts", params: {}, page: 1 });
      } catch {
        // loadRooms đã log lỗi và xử lý trạng thái
      }
    };

    fetchRealPosts();
  }, [user, loadRooms]);

  const fetchNearbyRooms = async (lat, lng, radius = searchRadius) => {
    try {
      await loadRooms({
        endpoint: "/api/posts/nearby",
        params: { lat, lng, radius },
        page: 1,
      });
    } catch (err) {
      console.error("fetchNearbyRooms Error:", err);
      console.error("Response Data:", err.response?.data);
      if (err.response?.status === 404) {
        alert("API /api/posts/nearby chưa hoạt động hoặc sai đường dẫn!");
      } else if (err.response?.status === 401) {
        alert("Vui lòng đăng nhập để xem danh sách phòng lân cận!");
      } else if (err.response?.status === 400) {
        alert(
          `Lỗi dữ liệu (400): ${err.response?.data?.message || JSON.stringify(err.response?.data)}`,
        );
      } else {
        alert(
          "Có lỗi xảy ra khi lấy danh sách phòng từ Backend. Nhấn F12 sang tab Console để xem chi tiết!",
        );
      }
    }
  };

  const buildPageRange = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const range = [1];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) {
      range.push("start-ellipsis");
    }

    for (let page = left; page <= right; page += 1) {
      range.push(page);
    }

    if (right < totalPages - 1) {
      range.push("end-ellipsis");
    }

    range.push(totalPages);
    return range;
  };

  const handlePageChange = async (page) => {
    if (page < 1 || page === currentPage || isLoadingRooms) return;
    if (totalPages && page > totalPages) return;

    try {
      await loadRooms({
        endpoint: currentEndpoint,
        params: currentParams,
        page,
      });
    } catch {
      // loadRooms đã xử lý lỗi và log
    }
  };

  const GEOLOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 0,
  };

  const handleGetLocation = (radiusParam = searchRadius) =>
    enforceAuth(() => {
      setIsLocating(true);
      if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ định vị GPS!");
        setIsLocating(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          localStorage.setItem(
            "lastKnownLocation",
            JSON.stringify({ latitude, longitude, ts: Date.now() }),
          );

          setSearchTerm(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          fetchNearbyRooms(latitude, longitude).finally(() => setIsLocating(false));

          (async () => {
            try {
              const GOONG_KEY = import.meta.env.VITE_GOONG_API_KEY;
              if (!GOONG_KEY?.trim()) return;
              const res = await axios.get(
                `https://rsapi.goong.io/Geocode?latlng=${latitude},${longitude}&api_key=${GOONG_KEY.trim()}`,
                { timeout: 3000 },
              );
              const formatted = res.data?.results?.[0]?.formatted_address;
              if (formatted) setSearchTerm(formatted);
            } catch {
              // Keep coordinate fallback
            }
          })();
        },
        () => {
          try {
            const cached = JSON.parse(localStorage.getItem("lastKnownLocation") || "null");
            const cacheAge = Date.now() - Number(cached?.ts || 0);
            if (cached?.latitude && cached?.longitude && cacheAge <= 90 * 1000) {
              setSearchTerm(
                `${Number(cached.latitude).toFixed(6)}, ${Number(cached.longitude).toFixed(6)}`,
              );
              fetchNearbyRooms(cached.latitude, cached.longitude).finally(() =>
                setIsLocating(false),
              );
              return;
            }
          } catch {
            // no-op
          }

          alert("Không thể lấy vị trí nhanh. Vui lòng bật GPS hoặc thử lại.");
          setIsLocating(false);
        },
        GEOLOCATION_OPTIONS,
      );
    });

  const handleSearch = async () =>
    enforceAuth(() => {
      const searchParams = {};
      if (searchTerm.trim()) searchParams.title = searchTerm.trim();
      if (filters.minPrice) searchParams.minPrice = filters.minPrice;
      if (filters.maxPrice) searchParams.maxPrice = filters.maxPrice;
      if (filters.roomType) searchParams.roomType = filters.roomType;

      const fetchSearch = async () => {
        try {
          const { items, meta } = await loadRooms({
            endpoint: "/api/posts",
            params: searchParams,
            page: 1,
          });

          let resultRooms = items;

          if (filters.amenities && filters.amenities.length > 0) {
            resultRooms = resultRooms.filter((room) => {
              const roomAmenities = new Set(
                room.amenities.map((a) =>
                  (a.type || a.name || a || "").toString().toLowerCase(),
                ),
              );

              return filters.amenities.every((selectedAmenity) =>
                roomAmenities.has(selectedAmenity.toLowerCase()),
              );
            });

            setRooms(resultRooms);
            setTotalResults(resultRooms.length);
            setHasMore(false);
            setTotalPages(1);
          } else {
            setTotalResults(meta.totalItems ?? resultRooms.length);
          }
        } catch (err) {
          console.error("Search API Error:", err);
          alert("Lỗi khi tìm kiếm, vui lòng thử lại!");
        }
      };

      fetchSearch();
    });

  return (
    <div className="bg-gray-50 text-gray-900 font-sans">
      <Hero />

      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearch={handleSearch}
        onLocationClick={handleGetLocation}
        isLocating={isLocating}
        filters={filters}
        setFilters={setFilters}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
      />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-10 flex items-end justify-between border-b border-gray-200 pb-5 text-gray-900 relative">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">Gợi ý phòng nổi bật</h2>
            <div className="w-24 h-1.5 bg-linear-to-r from-rose-500 to-orange-400 rounded-full -mb-6"></div>
          </div>
        </div>

        {isLoadingRooms ? (
          <div className="flex flex-col justify-center items-center py-32">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-rose-500 shadow-md"></div>
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Đang tìm kiếm phòng trọ tốt nhất...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-24 text-center bg-white rounded-[2rem] border border-gray-100 shadow-xs">
            <div className="w-24 h-24 mb-6 bg-linear-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center shadow-inner">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy phòng nào</h3>
            <p className="text-gray-500 max-w-md">Rất tiếc, không có bài đăng nào khớp với tìm kiếm của bạn. Vui lòng thử lại với các tiêu chí khác hoặc khu vực rộng hơn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {user?.role === "LANDLORD" && <AddRoomCard onClick={() => navigate("/add-room")} />}
            {rooms.map((room, index) => (
              <RoomCard
                key={room.id}
                room={room}
                index={index}
                onClick={() => enforceAuth(() => navigate(`/room/${room.id}`))}
              />
            ))}
          </div>
        )}

        {(totalPages > 1 || hasMore) && !isLoadingRooms && rooms.length > 0 && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-500">
              Trang {currentPage} / {totalPages} · Tổng {totalResults} bài
            </div>
            <div className="mt-3 flex items-center gap-1 sm:mt-0">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>

              {totalPages > 1 &&
                buildPageRange().map((pageNum, index) => {
                  if (typeof pageNum === "string") {
                    return (
                      <span
                        key={`${pageNum}-${index}`}
                        className="inline-flex h-9 min-w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-sm text-gray-400"
                      >
                        …
                      </span>
                    );
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`h-9 min-w-8 rounded-lg border px-3 text-sm font-semibold transition ${
                        pageNum === currentPage
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

              <button
                type="button"
                disabled={!hasMore}
                onClick={() => handlePageChange(currentPage + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}