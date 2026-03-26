import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RefreshCw, Search, Crosshair, Home as HomeIcon, Briefcase, Plus, Trash2, Check, Edit2 } from 'lucide-react';
import { roomsApi } from '../api/rooms';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuthStore } from '../store/authStore';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import RoomCard from '../components/room/RoomCard';
import { cn } from '../lib/utils';

const RADIUS_OPTIONS = [0.5, 1, 2, 3, 5];

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const { latitude, longitude, error: geoError, setLocation } = useGeolocation();
  const [radius, setRadius] = useState(2);
  const [search, setSearch] = useState('');
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('weorder_addresses');
    if (data) {
      const parsed = JSON.parse(data);
      setSavedAddresses(parsed);
      const active = parsed.find((a: any) => a.isActive);
      if (active) setActiveAddressId(active.id);
    }
  }, []);

  const saveToStorage = (list: any[]) => {
    localStorage.setItem('weorder_addresses', JSON.stringify(list));
    setSavedAddresses(list);
  };

  const handleSaveAddress = () => {
    const label = prompt('주소 별칭을 입력해주세요 (예: 우리집, 회사)', RoadName(roadAddress) || '내 동네');
    if (label === null) return;

    const newAddr = {
      id: Math.random().toString(36).substr(2, 9),
      label: label || '내 동네',
      roadAddress,
      jibunAddress,
      lat: latitude,
      lng: longitude,
      isActive: true,
    };

    const newList = savedAddresses.map(a => ({ ...a, isActive: false })).concat(newAddr);
    saveToStorage(newList);
    setActiveAddressId(newAddr.id);
    alert('새 주소가 저장되었습니다!');
  };

  const RoadName = (addr: string) => {
    if (!addr) return '';
    const parts = addr.split(' ');
    return parts[parts.length - 1]; // 대략적인 도로명/동네명 추출
  };

  const selectAddress = (addr: any) => {
    const newList = savedAddresses.map(a => ({
      ...a,
      isActive: a.id === addr.id
    }));
    saveToStorage(newList);
    setActiveAddressId(addr.id);
    setLocation(addr.lat, addr.lng);
    
    if (mapRef.current) {
        const naver = (window as any).naver;
        const center = new naver.maps.LatLng(addr.lat, addr.lng);
        mapRef.current.panTo(center);
        markerRef.current.setPosition(center);
    }
    fetchAddress(addr.lat, addr.lng);
  };

  const deleteAddress = (id: string, e: any) => {
    e.stopPropagation();
    if (!confirm('이 주소를 삭제할까요?')) return;
    const newList = savedAddresses.filter(a => a.id !== id);
    saveToStorage(newList);
    if (activeAddressId === id) setActiveAddressId(newList[0]?.id || null);
  };

  const fetchAddress = (lat: number, lng: number) => {
    const naver = (window as any).naver;
    if (!naver || !naver.maps || !naver.maps.Service) {
      setRoadAddress('API 설정에서 Geocoder가 누락되었거나 로드되지 않았습니다.');
      return;
    }
    
    naver.maps.Service.reverseGeocode({
      coords: new naver.maps.LatLng(lat, lng),
    }, function(status: any, response: any) {
      if (status !== naver.maps.Service.Status.OK) {
        setRoadAddress('주소를 찾을 수 없는 곳이에요.');
        setJibunAddress('');
        return;
      }
      const address = response.v2.address;
      setRoadAddress(address.roadAddress || address.jibunAddress || '상세 주소를 알 수 없어요');
      setJibunAddress(address.roadAddress ? address.jibunAddress : '');
    });
  };

  const handleFindMe = async () => {
    setRoadAddress('현재 위치 찾는 중...');
    try {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      setLocation(lat, lng);
      
      const naver = (window as any).naver;
      if (naver && mapRef.current) {
        const center = new naver.maps.LatLng(lat, lng);
        mapRef.current.panTo(center);
        fetchAddress(lat, lng);
      }
    } catch (e) {
      setRoadAddress('위치를 가져오지 못했어요.');
    }
  };

  useEffect(() => {
    if (!latitude || !longitude || typeof window === 'undefined' || mapRef.current) return;

    const initMap = () => {
      const naver = (window as any).naver;
      // 네이버 지도가 아직 준비되지 않았다면 0.1초 뒤에 다시 시도 (에러 방어)
      if (!naver || !naver.maps) {
        setTimeout(initMap, 100);
        return;
      }

      const center = new naver.maps.LatLng(latitude, longitude);
      
      mapRef.current = new naver.maps.Map('map', {
        center,
        zoom: 16,
      });

      markerRef.current = new naver.maps.Marker({
        position: center,
        map: mapRef.current,
        // 배민 스타일처럼 마커 자체는 움직이지 못하게 (오직 지도만 드래그)
        draggable: false, 
      });

      infoWindowRef.current = new naver.maps.InfoWindow({
        content: '<div style="background: #222; color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: -5px;">표시된 위치가 맞나요?<div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #222;"></div></div>',
        borderWidth: 0,
        backgroundColor: "transparent",
        disableAnchor: true,
        pixelOffset: new naver.maps.Point(0, -10)
      });

      fetchAddress(latitude, longitude);
      infoWindowRef.current.open(mapRef.current, markerRef.current);

      naver.maps.Event.addListener(mapRef.current, 'dragstart', () => {
        infoWindowRef.current.close();
      });

      // 지도를 움직이는 동안 마커도 중앙에 꽂힌 채로 따라가게 효과
      naver.maps.Event.addListener(mapRef.current, 'drag', () => {
        markerRef.current.setPosition(mapRef.current.getCenter());
      });

      naver.maps.Event.addListener(mapRef.current, 'idle', () => {
        const newCenter = mapRef.current.getCenter();
        markerRef.current.setPosition(newCenter);
        setLocation(newCenter.lat(), newCenter.lng());
        fetchAddress(newCenter.lat(), newCenter.lng());
        infoWindowRef.current.open(mapRef.current, markerRef.current);
      });
    };

    initMap();
  }, [latitude, longitude, setLocation]);

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ['rooms', latitude, longitude, radius],
    queryFn: () =>
      roomsApi.list({
        lat: latitude ?? undefined,
        lng: longitude ?? undefined,
        radius,
      }),
    enabled: true,
    refetchInterval: 10_000,
  });

  const filtered = rooms.filter(
    (r) =>
      r.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header
        title="WeOrder"
        showLogout
        right={
          <button
            onClick={() => refetch()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={17} className="text-gray-500" />
          </button>
        }
      />

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3 px-1">
          <p className="font-medium text-gray-800 text-[15px]">
            안녕하세요, <span className="text-primary-600">{user?.nickname}</span>님!
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-sm flex flex-col z-0 relative mb-4">
          <div style={{ height: '320px', width: '100%', zIndex: 0 }} className="relative bg-[#eee]">
            <div id="map" style={{ width: '100%', height: '100%' }}></div>
            
            <button
              onClick={handleFindMe}
              className="absolute bottom-5 right-4 z-10 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
              style={{ zIndex: 100 }}
            >
              <Crosshair size={22} className="text-gray-700" />
            </button>
          </div>

          <div className="bg-white p-5 border-x border-b border-gray-200">
            <div className="mb-4 min-h-[50px]">
              <h3 className="font-bold text-[18px] text-gray-900 leading-tight">
                {roadAddress || jibunAddress || (latitude ? '주소를 찾는 중...' : '위치를 찾는 중...')}
              </h3>
              {roadAddress && jibunAddress && roadAddress !== jibunAddress && (
                <p className="text-[14px] text-gray-400 mt-1">{jibunAddress}</p>
              )}
            </div>
            
            <div className="bg-[#FFF0F0] rounded-xl p-3 mb-4 text-center">
              <p className="text-[14px] text-[#FF5A5F] font-medium tracking-tight">
                지도의 표시와 실제 주소가 맞는지 확인해주세요.
              </p>
            </div>

            <div className="flex items-center justify-between mb-2 mt-2">
               <span className="text-xs text-gray-500 font-medium">배달방 탐색 반경</span>
               <span className="text-xs font-bold text-primary-600">{radius}km</span>
            </div>
            <div className="flex gap-1.5 mb-5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRadius(r); refetch(); }}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    radius === r
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>

            <button 
              onClick={handleSaveAddress}
              className="w-full bg-[#222222] hover:bg-black text-white py-3.5 rounded-xl font-bold text-[16px] transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              이 위치를 주소 목록에 추가
            </button>
          </div>
        </div>

        {/* 배민 스타일 주소 목록 섹션 */}
        {savedAddresses.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">저장된 주소지</h3>
              <Edit2 size={14} className="text-gray-400" />
            </div>
            <div className="divide-y divide-gray-50">
              {savedAddresses.map((addr) => (
                <div 
                  key={addr.id}
                  onClick={() => selectAddress(addr)}
                  className={cn(
                    "px-4 py-4 flex items-start gap-3 transition-colors active:bg-gray-50",
                    activeAddressId === addr.id ? "bg-primary-50/30" : ""
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    activeAddressId === addr.id ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    {addr.label.includes('집') ? <HomeIcon size={18} /> : 
                     addr.label.includes('회사') || addr.label.includes('일') ? <Briefcase size={18} /> : 
                     <MapPin size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[15px] truncate text-gray-900">{addr.label}</span>
                      {activeAddressId === addr.id && (
                        <span className="bg-blue-50 text-blue-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                          현재 설정된 주소
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-gray-500 truncate mb-0.5">{addr.roadAddress}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 ml-2">
                    {activeAddressId === addr.id ? (
                      <Check size={20} className="text-primary-500" />
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                    <button 
                      onClick={(e) => deleteAddress(addr.id, e)}
                      className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="식당 이름으로 검색"
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">
            주변 배달방 {filtered.length > 0 && <span className="text-primary-500">{filtered.length}</span>}
          </h2>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-36 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-600">주변에 모집 중인 방이 없어요</p>
            <p className="text-sm text-gray-400 mt-1">새 방을 만들어 이웃을 모아보세요!</p>
          </div>
        ) : (
          filtered.map((room) => <RoomCard key={room.id} room={room} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}
