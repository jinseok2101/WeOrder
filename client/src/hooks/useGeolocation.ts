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
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: '위치 서비스를 지원하지 않는 브라우저입니다.',
        loading: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        alert('위치 정보를 가져올 수 없습니다.\n\n* 모바일 브라우저는 보안(HTTPS) 연결이 아닐 경우 위치 접근을 자동으로 차단합니다.\n* 테스트를 위해 기본 위치(서울)로 설정됩니다.');
        setState({
          latitude: 37.5665,
          longitude: 126.978,
          error: '위치 접근이 거부되었습니다. 서울 중심 좌표로 설정합니다.',
          loading: false,
        });
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, []);

  return { ...state, setLocation };
}
