import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RefreshCw, Search } from 'lucide-react';
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

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
        zoom: 15,
      });

      markerRef.current = new naver.maps.Marker({
        position: center,
        map: mapRef.current,
        draggable: true,
      });

      naver.maps.Event.addListener(mapRef.current, 'click', (e: any) => {
        setLocation(e.coord.lat(), e.coord.lng());
        markerRef.current.setPosition(e.coord);
      });

      naver.maps.Event.addListener(markerRef.current, 'dragend', (e: any) => {
        setLocation(e.coord.lat(), e.coord.lng());
        mapRef.current.panTo(e.coord);
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
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
          <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
            <MapPin size={15} className="text-primary-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-gray-800">
                안녕하세요, <span className="text-primary-600">{user?.nickname}</span>님!
              </p>
              {geoError ? (
                <p className="text-xs text-amber-500 mt-0.5">{geoError}</p>
              ) : latitude ? (
                <p className="text-xs text-gray-400 mt-0.5">내 위치를 확인하고 수정할 수 있어요</p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">위치 확인 중...</p>
              )}
            </div>
          </div>

          {latitude && longitude && (
            <div className="rounded-xl overflow-hidden border border-gray-200 mb-4 flex flex-col z-0 relative">
              <div style={{ height: '200px', width: '100%', zIndex: 0 }}>
                <div id="map" style={{ width: '100%', height: '100%' }}></div>
              </div>
              <div className="bg-gray-50 px-2 py-1.5 text-xs text-gray-500 text-center border-t border-gray-200">
                👆 <b>지도 터치</b> 또는 <b>마커 드래그</b>로 내 위치를 고칠 수 있어요!
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">반경</span>
              <span className="text-xs font-bold text-primary-600">{radius}km</span>
            </div>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
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
          </div>
        </div>

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
