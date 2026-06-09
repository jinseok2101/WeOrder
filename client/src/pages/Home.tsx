import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Search,
  Crosshair,
  Home as HomeIcon,
  Briefcase,
  Plus,
  Trash2,
  Check,
  Edit2,
  X,
} from "lucide-react";
import { roomsApi } from "../api/rooms";
import { useGeolocation } from "../hooks/useGeolocation";
import { useAuthStore } from "../store/authStore";
import Header from "../components/layout/Header";
import BottomNav from "../components/layout/BottomNav";
import RoomCard from "../components/room/RoomCard";
import { cn } from "../lib/utils";
import { addressesApi, UserAddress } from "../api/addresses";
import MannerStars from "../components/room/MannerStars";
import UserProfileModal from "../components/room/UserProfileModal";
import { registerPushNotifications } from "../lib/push";


// 반경 필터 기능 제거

const extractDongName = (jibun: string, road: string) => {
  if (jibun) {
    const parts = jibun.split(/\s+/);
    const dong = parts.find((p) => p.endsWith("동") || p.endsWith("읍") || p.endsWith("면"));
    if (dong) return dong;
  }
  if (road) {
    const match = road.match(/\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(",");
      const dong = parts.map((p) => p.trim()).find((p) => p.endsWith("동") || p.endsWith("읍") || p.endsWith("면"));
      if (dong) return dong;
    }
    const parts = road.split(/\s+/);
    const dong = parts.find((p) => p.endsWith("동") || p.endsWith("읍") || p.endsWith("면"));
    if (dong) return dong;
  }
  return "";
};

export default function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [bannerType, setBannerType] = useState<'default' | 'denied' | null>(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') return 'default';
      if (Notification.permission === 'denied') return 'denied';
    }
    return null;
  });

  const handleEnableNotifications = async () => {
    try {
      await registerPushNotifications();
      if (Notification.permission === 'granted') {
        setBannerType(null);
      } else if (Notification.permission === 'denied') {
        setBannerType('denied');
      }
    } catch (e) {
      console.warn('Failed to subscribe from home banner:', e);
    }
  };

  const handleShowDeniedGuide = () => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (isStandalone) {
      alert(
        "🔓 아이폰 알림 차단 해제 방법:\n\n" +
        "1. 휴대폰의 [설정] 앱으로 이동합니다.\n" +
        "2. [알림] 메뉴를 선택합니다.\n" +
        "3. [WeOrder] 앱을 찾아서 클릭합니다.\n" +
        "4. [알림 허용] 스위치를 활성화(초록색)해주세요!"
      );
    } else {
      alert(
        "🔓 브라우저 알림 차단 해제 방법:\n\n" +
        "1. Safari/주소창 왼쪽의 브라우저 제어 아이콘 또는 자물쇠(🔒)를 누릅니다.\n" +
        "2. 알림 설정을 '허용'으로 변경해주세요.\n" +
        "3. 변경 후 앱을 새로고침 해주세요."
      );
    }
  };


  const {
    latitude,
    longitude,
    error: geoError,
    setLocation,
  } = useGeolocation();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

  // Daum 우편번호 서비스 임베드 및 지도 연동
  useEffect(() => {
    if (!isBottomSheetOpen || showMiniMap) return;

    const scriptId = "daum-postcode-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const initPostcode = () => {
      const postcodeContainer = document.getElementById("postcode-container");
      if (!postcodeContainer) return;

      postcodeContainer.innerHTML = ""; // 이전 내용 초기화

      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          const fullAddress = data.roadAddress || data.address;
          
          const naver = (window as any).naver;
          if (!naver || !naver.maps || !naver.maps.Service) {
            alert("지도 API가 로드되지 않았습니다.");
            return;
          }

          naver.maps.Service.geocode(
            { query: fullAddress },
            function (status: any, response: any) {
              if (status !== naver.maps.Service.Status.OK) {
                alert("주소 좌표 검색 중 오류가 발생했습니다.");
                return;
              }

              const addresses = response.v2?.addresses || [];
              if (addresses.length === 0) {
                alert("검색 결과의 좌표를 찾을 수 없습니다.");
                return;
              }

              selectSearchResultAddress(addresses[0]);
            }
          );
        },
        width: "100%",
        height: "100%",
      }).embed(postcodeContainer);
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = () => {
        initPostcode();
      };
      document.head.appendChild(script);
    } else {
      if ((window as any).daum && (window as any).daum.Postcode) {
        initPostcode();
      } else {
        script.onload = () => {
          initPostcode();
        };
      }
    }
  }, [isBottomSheetOpen, showMiniMap]);

  const selectSearchResultAddress = (address: any) => {
    const lat = parseFloat(address.y);
    const lng = parseFloat(address.x);
    const naver = (window as any).naver;

    setLocation(lat, lng);
    setShowMiniMap(true);
    setSearchResults([]);

    setTimeout(() => {
      const mapElement = document.getElementById("map");
      if (mapRef.current && mapElement) {
        const center = new naver.maps.LatLng(lat, lng);
        mapRef.current.setCenter(center);
        if (markerRef.current) {
          markerRef.current.setPosition(center);
        }
        if (infoWindowRef.current) {
          infoWindowRef.current.open(mapRef.current, markerRef.current);
        }
      }
    }, 150);

    fetchAddress(lat, lng);
  };


  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [roadAddress, setRoadAddress] = useState("");
  const [jibunAddress, setJibunAddress] = useState("");
  const [dongName, setDongName] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const roomMarkersRef = useRef<any[]>([]);

  // 주소 목록 불러오기
  const refreshAddresses = async () => {
    try {
      const list = await addressesApi.list();
      setSavedAddresses(list);
      const active = list.find((a) => a.isActive);
      if (active) {
        setActiveAddressId(active.id);
        setRoadAddress(active.roadAddress);
        setJibunAddress(active.jibunAddress || "");
        const parsedDong = extractDongName(active.jibunAddress || "", active.roadAddress);
        if (parsedDong) setDongName(parsedDong);
        setLocation(active.latitude, active.longitude);
      }
    } catch (error) {
      console.error("주소 목록 로드 실패:", error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshAddresses();
    }
  }, [user]);

  const handleSaveAddress = async () => {
    const hasHome = savedAddresses.some((a) => a.label === "우리집");
    const defaultLabel = hasHome ? "" : "우리집";

    const label = prompt(
      "주소 별칭을 입력해주세요 (예: 우리집, 회사)",
      defaultLabel,
    );
    if (label === null) return;

    const trimmed = label.trim();
    const finalLabel = trimmed || defaultLabel;

    if (!finalLabel) {
      alert("주소 별칭을 입력해주세요.");
      return;
    }

    if (latitude === null || longitude === null) {
      alert("위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    try {
      await addressesApi.add({
        label: finalLabel,
        roadAddress,
        jibunAddress: jibunAddress || undefined,
        latitude,
        longitude,
      });
      alert("새 주소가 저장되었습니다!");
      refreshAddresses();
    } catch (error) {
      alert("주소 저장에 실패했습니다.");
    }
  };

  const RoadName = (addr: string) => {
    if (!addr) return "";
    const parts = addr.split(" ");
    return parts[parts.length - 1]; // 대략적인 도로명/동네명 추출
  };

  const selectAddress = async (addr: UserAddress) => {
    try {
      // 1. 즉각적인 상태 갱신 (0ms 지연)
      setActiveAddressId(addr.id);
      setSavedAddresses((prev) =>
        prev.map((a) => ({ ...a, isActive: a.id === addr.id }))
      );
      setRoadAddress(addr.roadAddress);
      setJibunAddress(addr.jibunAddress || "");
      const parsedDong = extractDongName(addr.jibunAddress || "", addr.roadAddress);
      if (parsedDong) setDongName(parsedDong);
      setLocation(addr.latitude, addr.longitude);

      if (mapRef.current) {
        const naver = (window as any).naver;
        const center = new naver.maps.LatLng(addr.latitude, addr.longitude);
        mapRef.current.panTo(center);
        if (markerRef.current) {
          markerRef.current.setPosition(center);
        }
      }

      // 주소 선택 완료 즉시 바텀 시트 닫기
      setIsBottomSheetOpen(false);

      // 2. 백그라운드 API 호출
      await addressesApi.activate(addr.id);
      refreshAddresses();
    } catch (error) {
      alert("주소 선택에 실패했습니다.");
    }
  };

  const deleteAddress = async (id: string, e: any) => {
    e.stopPropagation();
    if (!confirm("이 주소를 삭제할까요?")) return;
    try {
      await addressesApi.delete(id);
      refreshAddresses();
    } catch (error) {
      alert("주소 삭제에 실패했습니다.");
    }
  };

  const handleEditAddressLabel = async (id: string, currentLabel: string, e: any) => {
    e.stopPropagation();
    const newLabel = prompt("새로운 주소 별칭을 입력해주세요 (예: 우리집, 회사)", currentLabel);
    if (newLabel === null) return;

    const trimmed = newLabel.trim();
    if (!trimmed) {
      alert("주소 별칭을 입력해주세요.");
      return;
    }

    try {
      await addressesApi.updateLabel(id, trimmed);
      refreshAddresses();
    } catch (error) {
      alert("주소 별칭 수정에 실패했습니다.");
    }
  };

  const fetchAddress = (lat: number, lng: number) => {
    const naver = (window as any).naver;
    if (!naver || !naver.maps || !naver.maps.Service) {
      setRoadAddress(
        "API 설정에서 Geocoder가 누락되었거나 로드되지 않았습니다.",
      );
      return;
    }

    naver.maps.Service.reverseGeocode(
      {
        coords: new naver.maps.LatLng(lat, lng),
      },
      function (status: any, response: any) {
        if (status !== naver.maps.Service.Status.OK) {
          setRoadAddress("주소를 찾을 수 없는 곳이에요.");
          setJibunAddress("");
          return;
        }
        const address = response.v2.address;
        setRoadAddress(
          address.roadAddress ||
            address.jibunAddress ||
            "상세 주소를 알 수 없어요",
        );
        setJibunAddress(address.roadAddress ? address.jibunAddress : "");
        // 역지오코딩 결과에서 '동' 이름 추출 (area3 = 읍/면/동 수준)
        const area3 = response.v2?.results?.[0]?.region?.area3?.name;
        if (area3) setDongName(area3);
      },
    );
  };

  const handleFindMe = () => {
    setRoadAddress("현재 위치 찾는 중...");
    
    const fallbackToIP = async () => {
      try {
        const res = await fallbackFetch("https://freeipapi.com/api/json");
        const data = await res.json();
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        updateMapLocation(lat, lng);
      } catch (e) {
        setRoadAddress("위치를 가져오지 못했어요.");
      }
    };

    const updateMapLocation = (lat: number, lng: number) => {
      setLocation(lat, lng);
      const naver = (window as any).naver;
      if (naver && mapRef.current) {
        const center = new naver.maps.LatLng(lat, lng);
        mapRef.current.panTo(center);
        if (markerRef.current) markerRef.current.setPosition(center);
        if (infoWindowRef.current) infoWindowRef.current.open(mapRef.current, markerRef.current);
        fetchAddress(lat, lng);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateMapLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            alert("⚠️ 위치 권한이 차단되어 있습니다.\n모바일(Safari 등) 설정에서 위치 접근을 '허용'해야 정확한 내 위치를 찾을 수 있습니다.");
          }
          fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      fallbackToIP();
    }
  };

  // 기존 코드와의 충돌을 피하기 위한 간단한 fetch alias
  const fallbackFetch = fetch;

  const handleFindMeClick = () => {
    setIsBottomSheetOpen(true);
    setShowMiniMap(true);
    setTimeout(() => {
      handleFindMe();
    }, 200);
  };

  // 지도 초기화 및 클린업
  useEffect(() => {
    if (!isBottomSheetOpen || !showMiniMap) {
      mapRef.current = null;
      markerRef.current = null;
      infoWindowRef.current = null;
      return;
    }

    if (
      !latitude ||
      !longitude ||
      typeof window === "undefined" ||
      mapRef.current
    )
      return;

    const initMap = () => {
      const naver = (window as any).naver;
      if (!naver || !naver.maps) {
        setTimeout(initMap, 100);
        return;
      }

      const mapElement = document.getElementById("map");
      if (!mapElement) {
        setTimeout(initMap, 100);
        return;
      }

      const center = new naver.maps.LatLng(latitude, longitude);

      mapRef.current = new naver.maps.Map("map", {
        center,
        zoom: 16,
      });

      markerRef.current = new naver.maps.Marker({
        position: center,
        map: mapRef.current,
        draggable: false,
        icon: {
          content: `
            <div style="
              position: absolute; 
              transform: translate(-50%, -34px); 
              display: flex; 
              flex-direction: column; 
              align-items: center;
            ">
              <!-- 파란색 SVG 마커 핀 (내 위치) -->
              <svg width="26" height="34" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.25));">
                <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="#3b82f6"/>
                <circle cx="14" cy="14" r="5" fill="white"/>
              </svg>
            </div>
          `,
          anchor: new naver.maps.Point(0, 0),
        },
      });

      infoWindowRef.current = new naver.maps.InfoWindow({
        content:
          '<div style="background: #222; color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: -5px;">표시된 위치가 맞나요?<div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #222;"></div></div>',
        borderWidth: 0,
        backgroundColor: "transparent",
        disableAnchor: true,
        pixelOffset: new naver.maps.Point(0, -42),
      });

      fetchAddress(latitude, longitude);
      infoWindowRef.current.open(mapRef.current, markerRef.current);

      naver.maps.Event.addListener(mapRef.current, "dragstart", () => {
        isDraggingRef.current = true;
        infoWindowRef.current.close();
      });

      naver.maps.Event.addListener(mapRef.current, "drag", () => {
        if (isDraggingRef.current) {
          markerRef.current.setPosition(mapRef.current.getCenter());
        }
      });

      naver.maps.Event.addListener(mapRef.current, "idle", () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const newCenter = mapRef.current.getCenter();
        markerRef.current.setPosition(newCenter);
        setLocation(newCenter.lat(), newCenter.lng());
        fetchAddress(newCenter.lat(), newCenter.lng());
        infoWindowRef.current.open(mapRef.current, markerRef.current);
      });
    };

    initMap();
  }, [latitude, longitude, setLocation, isBottomSheetOpen, showMiniMap]);

  const {
    data: rooms = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["rooms", latitude, longitude, dongName],
    queryFn: () =>
      roomsApi.list({
        lat: latitude ?? undefined,
        lng: longitude ?? undefined,
        dongName: dongName || undefined,
      }),
    enabled: true,
    refetchInterval: 10_000,
  });

  const filtered = rooms.filter(
    (r) =>
      r.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.pickupLocation &&
        r.pickupLocation.toLowerCase().includes(search.toLowerCase())),
  );

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined" || !isBottomSheetOpen || !showMiniMap) return;
    const naver = (window as any).naver;
    if (!naver || !naver.maps) return;

    // 기존 마커들 삭제
    roomMarkersRef.current.forEach((marker) => marker.setMap(null));
    roomMarkersRef.current = [];

    // 새로운 방 마커들 추가
    filtered.forEach((room) => {
      const position = new naver.maps.LatLng(room.latitude, room.longitude);
      const marker = new naver.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          content: `
            <div style="
              position: absolute; 
              transform: translate(-50%, -100%); 
              display: flex; 
              flex-direction: column; 
              align-items: center;
            ">
              <!-- 식당 이름 캡션 (위) -->
              <div style="
                background-color: white;
                color: #059669;
                padding: 3px 8px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 800;
                box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                white-space: nowrap;
                border: 1px solid #d1fae5;
                margin-bottom: 4px;
              ">
                ${room.restaurantName}
              </div>

              <!-- 초록색 SVG 마커 핀 (아래) -->
              <svg width="26" height="34" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.25));">
                <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="#10b981"/>
                <circle cx="14" cy="14" r="5" fill="white"/>
              </svg>
            </div>
          `,
          anchor: new naver.maps.Point(0, 0),
        },
      });

      // 마커 클릭 시 방으로 이동
      naver.maps.Event.addListener(marker, "click", () => {
        setIsBottomSheetOpen(false); // 바텀 시트 닫기
        navigate(`/rooms/${room.id}`);
      });

      roomMarkersRef.current.push(marker);
    });
  }, [filtered, navigate, isBottomSheetOpen, showMiniMap]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="WeOrder" showLogout showHome />

      {bannerType === 'default' && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-xs font-extrabold text-amber-800 tracking-wider">🔔 실시간 알림 받기</h4>
            <p className="text-[11px] text-amber-700 mt-1 font-semibold leading-relaxed">
              공동 배달 진행 상태, 실시간 배달 도착 상황 및 정산 입금 요청 소식을 실시간 알림으로 받아보세요!
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setBannerType(null)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
            >
              다음에
            </button>
            <button
              onClick={handleEnableNotifications}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              알림 켜기
            </button>
          </div>
        </div>
      )}

      {bannerType === 'denied' && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-xs font-extrabold text-rose-800 tracking-wider">⚠️ 기기 알림이 꺼져 있습니다</h4>
            <p className="text-[11px] text-rose-700 mt-1 font-semibold leading-relaxed">
              알림 권한이 차단되어 있습니다. 휴대폰 설정에서 알림 허용을 직접 켜주셔야 실시간 배달 및 정산 알림을 받으실 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setBannerType(null)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
            >
              닫기
            </button>
            <button
              onClick={handleShowDeniedGuide}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              설정 방법
            </button>
          </div>
        </div>
      )}


      <div className="px-4 pt-4 pb-2">

        <div className="flex items-center justify-between mb-3 px-1 flex-wrap">
          <p className="font-medium text-gray-800 text-[15px] flex items-center gap-1.5 flex-wrap">
            <span>안녕하세요,</span>
            <button
              onClick={() => {
                if (user?.id) {
                  setSelectedProfileUserId(user.id);
                  setIsUserProfileModalOpen(true);
                }
              }}
              className="text-primary-600 font-bold hover:underline cursor-pointer transition-colors"
            >
              {user?.nickname}
            </button>
            <span>님!</span>
            {user?.trustScore !== undefined && (
              <MannerStars rating={user.trustScore / 2} size={13} showText={true} />
            )}
          </p>
        </div>

        {/* 주소 트리거 버튼 바 (시나리오 A) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4 flex items-center justify-between">
          <button
            onClick={() => {
              setIsBottomSheetOpen(true);
              setShowMiniMap(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="flex-1 flex items-center gap-2 text-left cursor-pointer hover:opacity-85"
          >
            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
              {(() => {
                const activeLabel = savedAddresses.find((a) => a.isActive)?.label || "";
                if (activeLabel.includes("집")) return <HomeIcon size={20} />;
                if (activeLabel.includes("회사") || activeLabel.includes("일")) return <Briefcase size={20} />;
                return <MapPin size={20} />;
              })()}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[15px] text-gray-900">
                  {savedAddresses.find((a) => a.isActive)?.label || "위치 설정"}
                </span>
                <span className="text-gray-400 text-xs font-bold">▼</span>
              </div>
              <p className="text-[13px] text-gray-500 truncate mt-0.5">
                {roadAddress || "배달받을 동네를 설정해주세요."}
              </p>
            </div>
          </button>
          
          <button
            onClick={handleFindMeClick}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-50/50 transition-colors"
            title="현재 위치 찾기"
          >
            <Crosshair size={18} />
            <span className="text-[10px] font-bold mt-1">현위치</span>
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="식당 이름, 방 제목, 수령 장소로 검색"
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">
            주변 배달방{" "}
            {filtered.length > 0 && (
              <span className="text-primary-500">{filtered.length}</span>
            )}
          </h2>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-36 animate-pulse border border-gray-100"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600">
              주변에 모집 중인 방이 없어요
            </p>
            <p className="text-sm text-gray-400 mt-1">
              새 방을 만들어 이웃을 모아보세요!
            </p>
          </div>
        ) : (
          filtered.map((room) => <RoomCard key={room.id} room={room} />)
        )}
      </div>

      <BottomNav />

      {/* 바텀 시트 (주소 설정 전용 모달 - 시나리오 A) */}
      {isBottomSheetOpen && (
        <>
          {/* 어두운 반투명 백드롭 오버레이 */}
          <div 
            onClick={() => setIsBottomSheetOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 animate-in fade-in"
          />
          
          {/* 슬라이드인 바텀 드로워 */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl z-50 max-h-[85vh] overflow-y-auto flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* 드래그 핸들 바 */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 flex-shrink-0" />
            
            <div className="px-5 pb-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-[18px] font-extrabold text-gray-900">배달 주소 설정</h3>
                <button 
                  onClick={() => setIsBottomSheetOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Daum 우편번호 서비스 임베드 */}
              {!showMiniMap && (
                <div 
                  id="postcode-container" 
                  className="w-full border border-gray-200 rounded-2xl overflow-hidden mb-5 flex-shrink-0" 
                  style={{ height: "450px" }}
                />
              )}

              {/* 검색 결과 미니 지도 영역 (접이식) */}
              {showMiniMap && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 mb-5 shadow-sm flex flex-col z-0 relative flex-shrink-0 animate-in zoom-in-95 duration-200">
                  <div style={{ height: "200px", width: "100%", zIndex: 0 }} className="relative bg-[#eee]">
                    <div id="map" style={{ width: "100%", height: "100%" }}></div>
                  </div>
                  <div className="bg-white p-4">
                    <h4 className="font-extrabold text-[15px] text-gray-900 truncate">
                      {roadAddress || "선택한 주소"}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 mb-3">지도의 마커 위치를 확인해 주세요.</p>
                    <button
                      onClick={handleSaveAddress}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl font-bold text-[14px] transition-colors"
                    >
                      이 위치를 주소지로 설정 및 추가
                    </button>
                  </div>
                </div>
              )}

              {/* 저장된 주소 목록 */}
              <div className="flex-1 overflow-y-auto min-h-[150px]">
                <h4 className="text-xs font-extrabold text-gray-400 tracking-wider mb-2.5">저장된 배달 주소</h4>
                {savedAddresses.length > 0 ? (
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => selectAddress(addr)}
                        className={cn(
                          "px-4 py-3.5 border rounded-2xl flex items-start gap-3 transition-colors active:bg-gray-50 cursor-pointer",
                          activeAddressId === addr.id ? "bg-primary-50/20 border-primary-200" : "bg-white border-gray-100",
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            activeAddressId === addr.id ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-500",
                          )}
                        >
                          {addr.label.includes("집") ? (
                            <HomeIcon size={16} />
                          ) : addr.label.includes("회사") || addr.label.includes("일") ? (
                            <Briefcase size={16} />
                          ) : (
                            <MapPin size={16} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-[14px] text-gray-900 truncate">
                              {addr.label}
                            </span>
                            <button
                              onClick={(e) => handleEditAddressLabel(addr.id, addr.label, e)}
                              className="text-gray-300 hover:text-gray-500 p-0.5"
                              title="별칭 수정"
                            >
                              <Edit2 size={12} />
                            </button>
                            {activeAddressId === addr.id && (
                              <span className="bg-primary-50 text-primary-600 text-[9px] font-bold px-1 py-0.2 rounded">
                                선택됨
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-gray-500 truncate mt-0.5">
                            {addr.roadAddress}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-center ml-2 flex-shrink-0">
                          {activeAddressId === addr.id && <Check size={18} className="text-primary-500" />}
                          <button
                            onClick={(e) => deleteAddress(addr.id, e)}
                            className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-100 rounded-2xl">
                    <p className="text-sm text-gray-400">저장된 배달 주소가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 내 신뢰도 프로필 팝업 모달 */}
      {selectedProfileUserId && (
        <UserProfileModal
          isOpen={isUserProfileModalOpen}
          onClose={() => {
            setIsUserProfileModalOpen(false);
            setSelectedProfileUserId(null);
          }}
          userId={selectedProfileUserId}
        />
      )}
    </div>
  );
}
