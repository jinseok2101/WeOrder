import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const setLocation = useCallback((lat: number, lng: number) => {
    setState((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      error: null,
    }));
  }, []);

  useEffect(() => {
    // 1. 귀찮은 권한 팝업 없이 IP 주소 기반으로 조용히 위치를 추적합니다.
    fetch('https://get.geojs.io/v1/ip/geo.json')
      .then((res) => res.json())
      .then((data) => {
        setState({
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          error: null,
          loading: false,
        });
      })
      .catch(() => {
        // 2. 만약 IP 추적이 실패하더라도 앱이 멈추지 않고 서울을 가리키도록 방어합니다.
        setState({
          latitude: 37.5665,
          longitude: 126.978,
          error: '네트워크 문제로 대략적 위치를 찾지 못했습니다. 서울 중심부로 설정됩니다.',
          loading: false,
        });
      });
  }, []);

  return { ...state, setLocation };
}
