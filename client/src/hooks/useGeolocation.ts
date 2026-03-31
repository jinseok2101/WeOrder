import { useEffect } from 'react';
import { create } from 'zustand';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  setLocation: (lat: number, lng: number) => void;
  fetchIPLocation: () => Promise<void>;
}

// Zustand를 사용하여 위치 정보를 전역 상태로 관리
const useGeoStore = create<GeolocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  error: null,
  loading: true,
  setLocation: (lat: number, lng: number) => {
    set({ latitude: lat, longitude: lng, error: null });
  },
  fetchIPLocation: async () => {
    // 이미 지정된 위치(예: 사용자가 지도를 움직여 설정하거나 저장된 주소를 클릭한 경우)가 있다면 무시
    if (get().latitude !== null) return;
    
    try {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      
      // 비동기 요청 도중에 다른 위치가 설정되었을 수 있으므로 한 번 더 검사
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
        longitude: 126.978,
        error: '네트워크 문제로 대략적 위치를 찾지 못했습니다. 서울 중심부로 설정됩니다.',
        loading: false,
      });
    }
  }
}));

export function useGeolocation() {
  const store = useGeoStore();

  useEffect(() => {
    // 컴포넌트 마운트 시 최초 1회만 IP 위치 조회 수동 시작 (이미 위치가 있다면 스토어 내부에서 무시됨)
    store.fetchIPLocation();
  }, []);

  return {
    latitude: store.latitude,
    longitude: store.longitude,
    error: store.error,
    loading: store.loading,
    setLocation: store.setLocation,
  };
}
