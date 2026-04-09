import { useEffect } from 'react';
import { create } from 'zustand';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  setLocation: (lat: number, lng: number) => void;
  fetchLocation: () => Promise<void>;
}

// Zustand를 사용하여 위치 정보를 전역 상태로 관리
const useGeoStore = create<GeolocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  error: null,
  loading: true,
  setLocation: (lat: number, lng: number) => {
    set({ latitude: lat, longitude: lng, error: null, loading: false });
  },
  fetchLocation: async () => {
    // 이미 지정된 위치가 있다면 무시
    if (get().latitude !== null) return;
    
    set({ loading: true });

    // IP 기반 위치 조회 (Fallback)
    const fetchIPLocation = async () => {
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        
        if (get().latitude !== null) return;
        
        set({
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          error: null,
          loading: false,
        });
      } catch {
        if (get().latitude !== null) return;
        set({
          latitude: 37.5665,
          longitude: 126.978, // 서울시청 기본 좌표
          error: '위치 정보를 가져오지 못해 기본 위치로 설정되었습니다.',
          loading: false,
        });
      }
    };

    // 1. 디바이스의 정확한 GPS 조회 시도
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (get().latitude !== null) return;
          set({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          });
        },
        (error) => {
          console.warn('위치 권한 거부 또는 조회 실패, IP 위치로 대체합니다.', error);
          fetchIPLocation();
        },
        {
          enableHighAccuracy: true, // GPS 칩셋 등 고정밀 장치 사용
          timeout: 10000,           // 최대 대기 시간 10초
          maximumAge: 0,            // 캐시된 위치 대신 최신 위치 강제 요망
        }
      );
    } else {
      // API 미지원 브라우저
      fetchIPLocation();
    }
  }
}));

export function useGeolocation() {
  const store = useGeoStore();

  useEffect(() => {
    // 컴포넌트 마운트 시 최우선적으로 디바이스 GPS 위치 조회
    store.fetchLocation();
  }, []);

  return {
    latitude: store.latitude,
    longitude: store.longitude,
    error: store.error,
    loading: store.loading,
    setLocation: store.setLocation,
  };
}
