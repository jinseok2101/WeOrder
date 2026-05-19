import { useEffect } from 'react';
import { create } from 'zustand';
import * as Location from 'expo-location';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  setLocation: (lat: number, lng: number) => void;
  fetchLocation: (force?: boolean) => Promise<void>;
}

export const useGeoStore = create<GeolocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  error: null,
  loading: true,
  setLocation: (lat: number, lng: number) => {
    set({ latitude: lat, longitude: lng, error: null, loading: false });
  },
  fetchLocation: async (force = false) => {
    // 이미 위치가 있고 강제 새로고침이 아니라면 즉시 리턴
    if (!force && get().latitude !== null) return;
    
    set({ loading: true });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ error: '위치 권한이 거부되었습니다.', loading: false });
        // 권한이 없는데 기존 위치도 없다면 서울로 설정
        if (get().latitude === null) {
          set({ latitude: 37.5665, longitude: 126.978, loading: false });
        }
        return;
      }

      // 1. 가장 최근의 캐시된 위치 확인 (매우 빠르고 안정적임)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const { latitude: lat, longitude: lng } = lastKnown.coords;
        // 한국 좌표 범위 내인 경우에만 수락
        if (lat > 30 && lat < 45 && lng > 120 && lng < 140) {
          set({ 
            latitude: lat, 
            longitude: lng, 
            error: null, 
            loading: false 
          });
        }
        
        // 강제 새로고침이 아니라면 여기서 끝냄
        if (!force) return;
      }

      // 2. 실시간 현재 위치 요청 (GPS 신호가 약하면 실패하거나 느릴 수 있음)
      try {
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (location) {
          // 한국 내 좌표인지 검증 (위도 33~39, 경도 124~132 사이)
          // 이 범위를 벗어나면 에뮬레이터 기본값(미국 등)일 확률이 높음
          const { latitude: lat, longitude: lng } = location.coords;
          if (lat > 30 && lat < 45 && lng > 120 && lng < 140) {
            set({ 
              latitude: lat, 
              longitude: lng, 
              error: null, 
              loading: false 
            });
          } else {
            console.warn("Suspicious coordinates received (outside Korea), ignoring:", lat, lng);
            set({ loading: false });
          }
        }
      } catch (err) {
        // Balanced 실패 시 한 번 더 낮은 정확도로 시도
        try {
          const fallbackLocation = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Lowest,
          });
          if (fallbackLocation) {
            const { latitude: lat, longitude: lng } = fallbackLocation.coords;
            if (lat > 30 && lat < 45 && lng > 120 && lng < 140) {
              set({ 
                latitude: lat, 
                longitude: lng, 
                error: null, 
                loading: false 
              });
              return;
            }
          }
        } catch (finalErr) {
          // 모든 실시간 요청 실패 시 기존 위치 유지
          if (get().latitude === null) {
            set({ latitude: 37.5665, longitude: 126.978, loading: false });
          } else {
            set({ loading: false });
          }
        }
      }
    } catch (error) {
      if (get().latitude === null) {
        set({ latitude: 37.5665, longitude: 126.978, loading: false });
      } else {
        set({ loading: false });
      }
    }
  }
}));

export function useGeolocation() {
  const store = useGeoStore();

  useEffect(() => {
    store.fetchLocation();
  }, []);

  return {
    latitude: store.latitude,
    longitude: store.longitude,
    error: store.error,
    loading: store.loading,
    setLocation: store.setLocation,
    fetchLocation: store.fetchLocation,
  };
}
