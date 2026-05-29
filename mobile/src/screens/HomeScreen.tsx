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
import { Search, Crosshair, MapPin, Plus, Trash2, Check, Edit2, Home, Briefcase } from "lucide-react-native";

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

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
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
      // GPS 위치가 아직 잡히지 않은 경우에만 저장된 활성 주소로 위치 설정
      if (active && !latitude) {
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
    // 별칭을 빈칸으로 시작
    setNewLabel("");
    setIsModalVisible(true);
  };

  const confirmAddAddress = async () => {
    if (!newLabel.trim()) {
      Alert.alert("알림", "별칭을 입력해주세요.");
      return;
    }

    try {
      await addressesApi.add({
        label: newLabel.trim(),
        roadAddress: roadAddress,
        jibunAddress: jibunAddress || undefined,
        latitude: mapCenter!.latitude,
        longitude: mapCenter!.longitude,
      });
      setIsModalVisible(false);
      Alert.alert("성공", "주소가 목록에 추가되었습니다.");
      refreshAddresses();
    } catch (error) {
      console.error("주소 추가 실패:", error);
      Alert.alert("오류", "주소 추가에 실패했습니다.");
    }
  };

  const handleActivateAddress = async (id: string) => {
    try {
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

          <View className="rounded-2xl overflow-hidden bg-white mb-4">
            <View
              style={{ height: 320, width: "100%", backgroundColor: "#eee" }}
            >
              {geoError && (
                <View className="absolute top-4 left-4 right-4 z-20 bg-red-500/90 p-3 rounded-xl">
                  <Text className="text-white text-xs font-medium text-center">
                    {geoError}
                  </Text>
                </View>
              )}
              {mapCenter ? (
                <MapComponent
                  mapRef={mapRef}
                  mapCenter={mapCenter}
                  programmaticCenter={programmaticCenter}
                  setMapCenter={setMapCenter}
                  setLocation={setLocation}
                  filtered={filtered}
                  navigation={navigation}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#f97316" />
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  // 1. 즉시 현재 스토어에 있는 위치로 이동 (반응 속도 향상)
                  const { latitude: currentLat, longitude: currentLng } = useGeoStore.getState();
                  if (currentLat && currentLng) {
                    setMapCenter({ latitude: currentLat, longitude: currentLng });
                    moveCameraTo(currentLat, currentLng);
                  }
                  
                  // 2. 백그라운드에서 최신 위치 업데이트 요청
                  // (위치가 업데이트되면 useEffect[latitude, longitude]가 감지하여 한 번 더 정밀 이동함)
                  fetchLocation(true);
                }}
                className="absolute bottom-5 right-4 w-11 h-11 bg-white rounded-full items-center justify-center border border-gray-200"
              >
                <Crosshair size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <View className="p-5 border-t border-gray-200">
              <View className="mb-4">
                <Text className="font-bold text-[18px] text-gray-900 leading-tight">
                  {dongAddress || "위치 조회 중..."}
                </Text>
                <Text className="text-[14px] text-gray-500 mt-1">
                  {roadAddress}
                </Text>
              </View>

              <View className="bg-[#FFF0F0] rounded-xl p-3 mb-4 items-center">
                <Text className="text-[14px] text-[#FF5A5F] font-medium">
                  지도의 표시와 실제 주소가 맞는지 확인해주세요.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleAddAddress}
                className="w-full bg-[#222222] py-3.5 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Plus size={18} color="white" />
                <Text className="text-white font-bold text-[16px]">
                  이 위치를 주소 목록에 추가
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 저장된 주소지 섹션 */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="font-bold text-gray-900 text-lg">저장된 주소지</Text>
              <TouchableOpacity>
                <Edit2 size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            <View className="gap-3">
              {savedAddresses.length > 0 ? (
                savedAddresses.map((addr) => (
                  <View 
                    key={addr.id}
                    className={`flex-row items-center p-4 rounded-2xl border ${
                      addr.isActive 
                        ? 'bg-primary-50 border-primary-100' 
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <TouchableOpacity 
                      onPress={() => handleActivateAddress(addr.id)}
                      className="flex-1 flex-row items-center gap-3"
                    >
                      <View className={`w-10 h-10 rounded-full items-center justify-center ${
                        addr.isActive ? 'bg-primary-500' : 'bg-gray-100'
                      }`}>
                        {addr.label.includes("집") ? (
                          <Home size={18} color={addr.isActive ? 'white' : '#6b7280'} />
                        ) : addr.label.includes("회사") || addr.label.includes("일") ? (
                          <Briefcase size={18} color={addr.isActive ? 'white' : '#6b7280'} />
                        ) : (
                          <MapPin size={18} color={addr.isActive ? 'white' : '#6b7280'} />
                        )}
                      </View>
                      
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-0.5">
                          <Text className={`font-bold text-[15px] ${
                            addr.isActive ? 'text-primary-900' : 'text-gray-900'
                          }`}>
                            {addr.label}
                          </Text>
                          {addr.isActive && (
                            <View className="bg-primary-500 px-1.5 py-0.5 rounded">
                              <Text className="text-[10px] text-white font-bold">현재 설정된 주소</Text>
                            </View>
                          )}
                        </View>
                        <Text 
                          numberOfLines={1}
                          className={`text-[13px] ${
                            addr.isActive ? 'text-primary-700' : 'text-gray-500'
                          }`}
                        >
                          {addr.roadAddress}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View className="flex-row items-center gap-2">
                      {addr.isActive && (
                        <Check size={18} color="#f97316" />
                      )}
                      <TouchableOpacity 
                        onPress={() => handleDeleteAddress(addr.id)}
                        className="p-2"
                      >
                        <Trash2 size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-100 border-dashed">
                  <Text className="text-gray-400 text-sm">저장된 주소가 없습니다.</Text>
                </View>
              )}
            </View>
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

      {/* 주소 별칭 입력 모달 */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <Text className="text-xl font-bold text-gray-900 mb-2">주소 별칭 저장</Text>
            <Text className="text-sm text-gray-500 mb-5">이 위치를 어떤 이름으로 저장할까요?</Text>
            
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="예: 우리집, 회사, 동네"
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
