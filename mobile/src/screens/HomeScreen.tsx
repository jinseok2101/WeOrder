import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { WebView } from "react-native-webview";
import { Search, Crosshair, MapPin, Plus, Trash2, Check, Edit2, Home, Briefcase, X } from "lucide-react-native";

import { roomsApi } from "../api/rooms";
import { addressesApi, UserAddress } from "../api/addresses";
import { useGeolocation, useGeoStore } from "../hooks/useGeolocation";
import { useAuthStore } from "../store/authStore";
import Header from "../components/layout/Header";
import BottomNav from "../components/layout/BottomNav";
import RoomCard from "../components/room/RoomCard";
import MapComponent from "../components/map/MapComponent";
import MannerStars from "../components/room/MannerStars";
import UserProfileModal from "../components/room/UserProfileModal";

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

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const isProgrammaticSelectRef = useRef(false);
  const {
    latitude,
    longitude,
    setLocation,
    fetchLocation,
    error: geoError,
  } = useGeolocation();

  const [search, setSearch] = useState("");
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [roadAddress, setRoadAddress] = useState("위치 조회 중...");
  const [jibunAddress, setJibunAddress] = useState("");
  const [dongAddress, setDongAddress] = useState("");
  const [dongName, setDongName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);

  const closeBottomSheet = () => {
    setIsBottomSheetOpen(false);
    setShowMiniMap(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const daumPostcodeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        html, body, #wrap { width: 100%; height: 100%; margin: 0; padding: 0; background-color: #ffffff; }
      </style>
      <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    </head>
    <body>
      <div id="wrap"></div>
      <script>
        var element_wrap = document.getElementById('wrap');
        new daum.Postcode({
          oncomplete: function(data) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          },
          width: '100%',
          height: '100%'
        }).embed(element_wrap);
      </script>
    </body>
    </html>
  `;

  const selectSearchResultAddress = (address: any) => {
    const lat = parseFloat(address.y);
    const lng = parseFloat(address.x);

    setMapCenter({ latitude: lat, longitude: lng });
    moveCameraTo(lat, lng);
    setLocation(lat, lng);
    setSearchResults([]);
    setShowMiniMap(true);
  };

  const handleFindMeClick = () => {
    setIsBottomSheetOpen(true);
    setShowMiniMap(true);
    
    const { latitude: currentLat, longitude: currentLng } = useGeoStore.getState();
    if (currentLat && currentLng) {
      setMapCenter({ latitude: currentLat, longitude: currentLng });
      moveCameraTo(currentLat, currentLng);
      setLocation(currentLat, currentLng);
    }
    
    fetchLocation(true);
  };
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const handleEditAddressLabel = (id: string, currentLabel: string) => {
    setEditingAddressId(id);
    setNewLabel(currentLabel);
    setModalMode('edit');
    setIsModalVisible(true);
  };
  // mapCenter: 마커 위치 (드래그 시 카메라를 따라감)
  const [mapCenter, setMapCenter] = useState<{latitude: number; longitude: number} | null>(null);
  // programmaticCenter: NaverMapView의 center prop — 명시적으로 카메라를 이동할 때만 변경
  const [programmaticCenter, setProgrammaticCenter] = useState<{latitude: number; longitude: number; zoom: number} | null>(null);
  // 같은 좌표로 setProgrammaticCenter를 호출해도 RN 브릿지가 무시하지 않도록 매번 zoom을 미세하게 변경
  const centerCounterRef = useRef(0);
  const moveCameraTo = (lat: number, lng: number) => {
    centerCounterRef.current += 1;
    // zoom에 아주 작은 오프셋 (0.0001 단위) → 사용자에게 보이지 않지만 RN 브릿지는 새 값으로 인식
    const zoom = 15 + (centerCounterRef.current % 10) * 0.0001;
    setProgrammaticCenter({ latitude: lat, longitude: lng, zoom });
  };

  const { data: rooms = [], isLoading: isRoomsLoading } = useQuery({
    queryKey: ["rooms", mapCenter?.latitude, mapCenter?.longitude, dongName],
    queryFn: () =>
      roomsApi.list({
        lat: mapCenter?.latitude ?? undefined,
        lng: mapCenter?.longitude ?? undefined,
        dongName: dongName || undefined,
      }),
  });

  const filtered = rooms.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
      (r.pickupLocation &&
        r.pickupLocation.toLowerCase().includes(search.toLowerCase())),
  );

  const refreshAddresses = async () => {
    try {
      const list = await addressesApi.list();
      setSavedAddresses(list);
      const active = list.find((a) => a.isActive);
      if (active) {
        setRoadAddress(active.roadAddress);
        setJibunAddress(active.jibunAddress || "");
        const parsedDong = extractDongName(active.jibunAddress || "", active.roadAddress);
        if (parsedDong) {
          setDongAddress(active.jibunAddress || active.roadAddress);
          setDongName(parsedDong);
        }
        // GPS 위치가 아직 잡히지 않은 경우에만 저장된 활성 주소로 위치 설정
        if (!latitude) {
          isProgrammaticSelectRef.current = true;
          setLocation(active.latitude, active.longitude);
        }
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

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=legalcode,admcode,addr,roadaddr`,
        {
          headers: {
            "X-NCP-APIGW-API-KEY-ID": process.env.EXPO_PUBLIC_NAVER_CLIENT_ID || "",
            "X-NCP-APIGW-API-KEY": process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET || "",
          },
        }
      );
      const data = await response.json();

      if (data.status?.code === 0 && data.results?.length > 0) {
        // PC 버전과 동일한 주소 추출 로직
        const region = data.results[0].region;
        const area1 = region.area1.name;
        const area2 = region.area2.name;
        const area3 = region.area3.name;
        
        setDongAddress(`${area1} ${area2} ${area3}`);
        setDongName(area3 || "");

        const roadResult = data.results.find((r: any) => r.name === "roadaddr");
        const jibunResult = data.results.find((r: any) => r.name === "addr");

        const getFullAddr = (res: any) => {
          if (!res) return "";
          const { region: r, land: l } = res;
          const base = `${r.area1.name} ${r.area2.name} ${r.area3.name}`;
          if (!l) return base;
          
          const landName = res.name === "roadaddr" ? `${l.name} ` : "";
          return `${base} ${landName}${l.number1}${l.number2 ? "-" + l.number2 : ""}`;
        };

        const road = getFullAddr(roadResult);
        const jibun = getFullAddr(jibunResult);

        setRoadAddress(road || jibun || "상세 주소를 알 수 없어요");
        setJibunAddress(road ? jibun : "");
      } else {
        setRoadAddress("주소를 찾을 수 없는 곳이에요.");
        setJibunAddress("");
        setDongAddress("위치 알 수 없음");
        setDongName("");
      }
    } catch (error) {
      console.error("주소 변환 API 호출 에러:", error);
      setRoadAddress("주소 정보를 가져오지 못했습니다.");
    }
  };


  const mapRef = useRef<any>(null);
  const addressDebounceRef = useRef<any>(null);

  // GPS 위치를 처음 받았을 때 마커와 카메라를 모두 초기화
  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter({ latitude, longitude });
      moveCameraTo(latitude, longitude);
    }
  }, [latitude, longitude]);

  // 마커(지도 중심)이 바뀌면 주소를 업데이트 (디바운스 500ms)
  useEffect(() => {
    if (mapCenter?.latitude && mapCenter?.longitude) {
      if (isProgrammaticSelectRef.current) {
        isProgrammaticSelectRef.current = false;
        return;
      }
      clearTimeout(addressDebounceRef.current);
      addressDebounceRef.current = setTimeout(() => {
        fetchAddress(mapCenter.latitude, mapCenter.longitude);
      }, 500);
    }
    return () => clearTimeout(addressDebounceRef.current);
  }, [mapCenter]);

  const handleAddAddress = () => {
    if (!mapCenter || !roadAddress || roadAddress === "위치 조회 중...") {
      Alert.alert("알림", "주소를 조회 중이거나 위치가 올바르지 않습니다.");
      return;
    }
    setNewLabel("");
    setModalMode('add');
    setEditingAddressId(null);
    setIsModalVisible(true);
  };

  const confirmAddAddress = async () => {
    const hasHome = savedAddresses.some((a) => a.label === "우리집");
    const defaultLabel = modalMode === 'add' && !hasHome ? "우리집" : "";

    let finalLabel = newLabel.trim();
    if (!finalLabel) {
      if (defaultLabel) {
        finalLabel = defaultLabel;
      } else {
        Alert.alert("알림", "별칭을 입력해주세요.");
        return;
      }
    }

    try {
      if (modalMode === 'add') {
        await addressesApi.add({
          label: finalLabel,
          roadAddress: roadAddress,
          jibunAddress: jibunAddress || undefined,
          latitude: mapCenter!.latitude,
          longitude: mapCenter!.longitude,
        });
        Alert.alert("성공", "주소가 목록에 추가되었습니다.");
        setIsBottomSheetOpen(false); // 주소 설정 완료 후 바텀 시트 닫기
      } else {
        await addressesApi.updateLabel(editingAddressId!, finalLabel);
        Alert.alert("성공", "주소 별칭이 수정되었습니다.");
      }
      setIsModalVisible(false);
      refreshAddresses();
    } catch (error) {
      console.error("주소 저장 실패:", error);
      Alert.alert("오류", "주소 저장에 실패했습니다.");
    }
  };

  const handleActivateAddress = async (id: string) => {
    try {
      const selected = savedAddresses.find((a) => a.id === id);
      if (selected) {
        // 1. 즉각적인 상태 갱신 (0ms 지연)
        setSavedAddresses((prev) =>
          prev.map((a) => ({ ...a, isActive: a.id === id }))
        );
        setRoadAddress(selected.roadAddress);
        setJibunAddress(selected.jibunAddress || "");
        const parsedDong = extractDongName(selected.jibunAddress || "", selected.roadAddress);
        if (parsedDong) {
          setDongAddress(selected.jibunAddress || selected.roadAddress);
          setDongName(parsedDong);
        }

        // 카메라 이동 시 역지오코딩 방지 설정
        isProgrammaticSelectRef.current = true;

        setLocation(selected.latitude, selected.longitude);
        setMapCenter({ latitude: selected.latitude, longitude: selected.longitude });
        moveCameraTo(selected.latitude, selected.longitude);
      }
      setIsBottomSheetOpen(false); // 주소 설정 완료 즉시 바텀 시트 닫기

      // 2. 백그라운드 API 호출 및 서버 동기화
      await addressesApi.activate(id);
      refreshAddresses();
    } catch (error) {
      console.error("주소 활성화 실패:", error);
      Alert.alert("오류", "주소 변경에 실패했습니다.");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    Alert.alert("삭제 확인", "이 주소를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await addressesApi.delete(id);
            refreshAddresses();
          } catch (error) {
            console.error("주소 삭제 실패:", error);
            Alert.alert("오류", "주소 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50 pb-24">
      <Header title="WeOrder" showLogout showHome />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center flex-wrap mb-3 px-1">
            <Text className="font-medium text-gray-800 text-[15px]">안녕하세요, </Text>
            <TouchableOpacity
              onPress={() => {
                if (user?.id) {
                  setSelectedProfileUserId(user.id);
                  setIsUserProfileModalOpen(true);
                }
              }}
              activeOpacity={0.7}
              style={{ justifyContent: 'center', alignItems: 'center' }}
            >
              <Text className="text-primary-600 font-bold underline text-[15px]">
                {user?.nickname}
              </Text>
            </TouchableOpacity>
            <Text className="font-medium text-gray-800 text-[15px] mr-2">님!</Text>
            {user?.trustScore !== undefined && (
              <MannerStars rating={user.trustScore / 2} size={13} showText={true} />
            )}
          </View>

          {/* 주소 트리거 버튼 바 (시나리오 A) */}
          <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                setIsBottomSheetOpen(true);
                setShowMiniMap(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              activeOpacity={0.7}
              className="flex-1 flex-row items-center gap-2"
            >
              <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                <MapPin size={20} color="#f97316" />
              </View>
              <View className="flex-1 pr-2">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-extrabold text-[15px] text-gray-900">
                    {savedAddresses.find((a) => a.isActive)?.label || "위치 설정"}
                  </Text>
                  <Text className="text-gray-400 text-xs font-bold">▼</Text>
                </View>
                <Text numberOfLines={1} className="text-[13px] text-gray-500 mt-0.5">
                  {roadAddress || "배달받을 동네를 설정해주세요."}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleFindMeClick}
              activeOpacity={0.7}
              className="items-center justify-center p-2 rounded-xl"
            >
              <Crosshair size={18} color="#9ca3af" />
              <Text className="text-[10px] font-bold mt-1 text-gray-400">현위치</Text>
            </TouchableOpacity>
          </View>

          <View className="relative mb-4 justify-center">
            <View className="absolute left-3.5 z-10">
              <Search size={16} color="#9ca3af" />
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="식당 이름, 방 제목, 수령 장소로 검색"
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm"
            />
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-gray-900">
              주변 배달방{" "}
              {filtered.length > 0 && (
                <Text className="text-primary-500">{filtered.length}</Text>
              )}
            </Text>
          </View>
        </View>

        <View className="px-4 pb-10">
          {isRoomsLoading ? (
            <ActivityIndicator size="large" color="#f97316" className="mt-10" />
          ) : filtered.length === 0 ? (
            <View className="items-center py-16">
              <View className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center mb-3">
                <Search size={28} color="#d1d5db" />
              </View>
              <Text className="font-semibold text-gray-600">
                주변에 모집 중인 방이 없어요
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                새 방을 만들어 이웃을 모아보세요!
              </Text>
            </View>
          ) : (
            filtered.map((room) => <RoomCard key={room.id} room={room} />)
          )}
        </View>
      </ScrollView>

      <BottomNav />

      {/* 바텀 시트 (주소 설정 전용 모달 - 시나리오 A) */}
      <Modal
        visible={isBottomSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeBottomSheet}
      >
        <View className="flex-1 bg-black/60 justify-end">
          {/* 어두운 반투명 백드롭 오버레이 터치 시 닫기 */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={closeBottomSheet} 
            className="absolute inset-0"
          />
          
          {/* 슬라이드인 바텀 드로워 */}
          <View className="bg-white rounded-t-[32px] shadow-2xl max-h-[85%] pb-8">
            {/* 드래그 핸들 바 */}
            <View className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3" />
            
            <View className="px-5 flex-col" style={{ maxHeight: '95%' }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[18px] font-extrabold text-gray-900">배달 주소 설정</Text>
                <TouchableOpacity 
                  onPress={closeBottomSheet}
                  className="p-1 rounded-full bg-gray-100"
                >
                  <X size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Daum 우편번호 서비스 임베드 */}
              {!showMiniMap && (
                <View style={{ height: 450, width: "100%", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 20 }}>
                  <WebView
                    source={{ html: daumPostcodeHtml }}
                    onMessage={async (event) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        const fullAddress = data.roadAddress || data.address;
                        
                        // 네이버 지오코딩 REST API로 좌표 검색
                        const response = await fetch(
                          `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(fullAddress)}`,
                          {
                            headers: {
                              "X-NCP-APIGW-API-KEY-ID": process.env.EXPO_PUBLIC_NAVER_CLIENT_ID || "",
                              "X-NCP-APIGW-API-KEY": process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET || "",
                            },
                          }
                        );
                        const resData = await response.json();

                        if (resData.status === "OK" && resData.addresses?.length > 0) {
                          const addr = resData.addresses[0];
                          const lat = parseFloat(addr.y);
                          const lng = parseFloat(addr.x);

                          setMapCenter({ latitude: lat, longitude: lng });
                          moveCameraTo(lat, lng);
                          setLocation(lat, lng);
                          setShowMiniMap(true);
                        } else {
                          Alert.alert("오류", "선택한 주소의 좌표 정보를 가져올 수 없습니다.");
                        }
                      } catch (err) {
                        console.error("Geocoding failed:", err);
                        Alert.alert("오류", "주소 좌표 변환에 실패했습니다.");
                      }
                    }}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                </View>
              )}

              <ScrollView 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                className="mb-8"
              >
                {/* 검색 결과 미니 지도 영역 (접이식) */}
                {showMiniMap && (
                  <View className="rounded-2xl overflow-hidden border border-gray-200 mb-5 shadow-sm bg-white">
                    <View style={{ height: 200, width: "100%", backgroundColor: "#eee" }}>
                      <MapComponent
                        mapRef={mapRef}
                        mapCenter={mapCenter}
                        programmaticCenter={programmaticCenter}
                        setMapCenter={setMapCenter}
                        setLocation={setLocation}
                        filtered={filtered}
                        navigation={navigation}
                      />
                    </View>
                    <View className="p-4 bg-white border-t border-gray-100">
                      <Text className="font-extrabold text-[15px] text-gray-900" numberOfLines={1}>
                        {roadAddress || "선택한 주소"}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1 mb-3">지도의 마커 위치를 확인해 주세요.</Text>
                      <TouchableOpacity
                        onPress={handleAddAddress}
                        className="w-full bg-primary-500 py-3 rounded-xl items-center"
                      >
                        <Text className="text-white font-bold text-[14px]">
                          이 위치를 주소지로 설정 및 추가
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* 저장된 주소 목록 */}
                <View className="pb-10">
                  <Text className="text-xs font-extrabold text-gray-400 tracking-wider mb-2.5">저장된 배달 주소</Text>
                  {savedAddresses.length > 0 ? (
                    <View className="gap-2">
                      {savedAddresses.map((addr) => (
                        <View 
                          key={addr.id}
                          className={`flex-row items-center p-3.5 border rounded-2xl ${
                            addr.isActive 
                              ? 'bg-primary-50 border-primary-100' 
                              : 'bg-white border-gray-100'
                          }`}
                        >
                          <TouchableOpacity 
                            onPress={() => handleActivateAddress(addr.id)}
                            className="flex-1 flex-row items-center gap-3"
                          >
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${
                              addr.isActive ? 'bg-primary-500' : 'bg-gray-100'
                            }`}>
                              {addr.label.includes("집") ? (
                                <Home size={16} color={addr.isActive ? 'white' : '#6b7280'} />
                              ) : addr.label.includes("회사") || addr.label.includes("일") ? (
                                <Briefcase size={16} color={addr.isActive ? 'white' : '#6b7280'} />
                              ) : (
                                <MapPin size={16} color={addr.isActive ? 'white' : '#6b7280'} />
                              )}
                            </View>
                            
                            <View className="flex-1">
                              <View className="flex-row items-center gap-1.5 flex-wrap">
                                <Text className={`font-bold text-[14px] ${
                                  addr.isActive ? 'text-primary-900' : 'text-gray-900'
                                }`}>
                                  {addr.label}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleEditAddressLabel(addr.id, addr.label)}
                                  activeOpacity={0.7}
                                  className="p-0.5"
                                >
                                  <Edit2 size={12} color="#9ca3af" />
                                </TouchableOpacity>
                                {addr.isActive && (
                                  <View className="bg-primary-500 px-1 py-0.2 rounded">
                                    <Text className="text-[9px] text-white font-bold">선택됨</Text>
                                  </View>
                                )}
                              </View>
                              <Text 
                                numberOfLines={1}
                                className={`text-[12px] mt-0.5 ${
                                  addr.isActive ? 'text-primary-700' : 'text-gray-500'
                                }`}
                              >
                                {addr.roadAddress}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View className="flex-row items-center gap-2 self-center ml-2">
                            {addr.isActive && (
                              <Check size={18} color="#f97316" />
                            )}
                            <TouchableOpacity 
                              onPress={() => handleDeleteAddress(addr.id)}
                              className="p-1.5"
                            >
                              <Trash2 size={15} color="#9ca3af" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="p-8 items-center justify-center border border-gray-100 border-dashed rounded-2xl">
                      <Text className="text-gray-400 text-sm">저장된 주소가 없습니다.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* 주소 별칭 입력 모달 */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {modalMode === 'add' ? '주소 별칭 저장' : '주소 별칭 수정'}
            </Text>
            <Text className="text-sm text-gray-500 mb-5">
              {modalMode === 'add' ? '이 위치를 어떤 이름으로 저장할까요?' : '주소지의 새 별칭을 입력해주세요.'}
            </Text>
            
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder={
                modalMode === 'edit'
                  ? "새로운 별칭을 입력해주세요."
                  : savedAddresses.some((a) => a.label === "우리집")
                  ? ""
                  : "우리집"
              }
              autoFocus
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base mb-6"
            />
            
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setIsModalVisible(false)}
                className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
              >
                <Text className="text-gray-600 font-bold text-base">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmAddAddress}
                className="flex-1 bg-primary-500 py-3.5 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-base">저장하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}
