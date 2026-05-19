import React from "react";
import { UIManager, Platform, View, Text } from "react-native";
import NaverMapView, { Marker as NaverMarker } from "react-native-nmap";
import MapView, { Marker as GoogleMarker } from "react-native-maps";
import { MapPin } from "lucide-react-native";

const isNaverMapAvailable =
  Platform.OS !== "web" && UIManager.getViewManagerConfig("RNNaverMapView");

export default function MapComponent({
  mapRef,
  mapCenter,
  programmaticCenter,
  setMapCenter,
  setLocation,
  filtered,
  navigation,
}: any) {
  const isFirstLoad = React.useRef(true);

  // programmaticCenter가 변경될 때마다 지도를 이동시킴 (명시적 이동)
  React.useEffect(() => {
    if (programmaticCenter && mapRef.current) {
      if (isNaverMapAvailable) {
        // NaverMapView인 경우
        mapRef.current.animateToCoordinate(programmaticCenter);
      } else {
        // Google Map (MapView)인 경우
        mapRef.current.animateToRegion({
          latitude: programmaticCenter.latitude,
          longitude: programmaticCenter.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    }
  }, [programmaticCenter]);

  if (isNaverMapAvailable) {
    return (
      <NaverMapView
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        // 초기 중심점 설정 (처음 한 번만 사용되도록 의도)
        center={isFirstLoad.current && programmaticCenter ? programmaticCenter : undefined}
        // @ts-ignore
        onInitialized={() => {
          isFirstLoad.current = false;
          if (programmaticCenter) {
            mapRef.current?.animateToCoordinate(programmaticCenter);
          }
        }}
        onCameraChange={(e: any) => {
          // 지도가 움직이면 (드래그든 프로그래밍 이동이든) 마커도 따라감
          setMapCenter({ latitude: e.latitude, longitude: e.longitude });
        }}
        onMapClick={() => {
          setLocation(mapCenter.latitude, mapCenter.longitude);
        }}
      >
        <NaverMarker coordinate={mapCenter} pinColor="blue" caption={{ text: "현재 위치" }} />
        {filtered
          .filter((r: any) => r.latitude && r.longitude)
          .map((room: any) => (
            <NaverMarker
              key={room.id}
              coordinate={{
                latitude: Number(room.latitude),
                longitude: Number(room.longitude),
              }}
              pinColor="green"
              caption={{
                text: room.restaurantName,
                textSize: 10,
                color: "#059669",
                haloColor: "#ffffff",
              }}
              onClick={() => navigation.navigate("RoomDetail", { id: room.id })}
            />
          ))}
      </NaverMapView>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={{ width: "100%", height: "100%" }}
      initialRegion={{
        latitude: mapCenter.latitude,
        longitude: mapCenter.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onRegionChangeComplete={(region: any) => {
        setMapCenter({
          latitude: region.latitude,
          longitude: region.longitude,
        });
        setLocation(region.latitude, region.longitude);
      }}
    >
      <GoogleMarker coordinate={mapCenter} anchor={{ x: 0.5, y: 1 }}>
        <View style={{ alignItems: "center" }}>
          <MapPin size={24} color="#3b82f6" fill="#3b82f6" />
        </View>
      </GoogleMarker>
      {filtered
        .filter((r: any) => r.latitude && r.longitude)
        .map((room: any) => (
          <GoogleMarker
            key={room.id}
            coordinate={{ latitude: room.latitude, longitude: room.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => navigation.navigate("RoomDetail", { id: room.id })}
          >
            <View style={{ alignItems: "center" }}>
              {/* 식당 이름 캡션 (위) */}
              <View style={{
                backgroundColor: "white",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#d1fae5",
                marginBottom: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 1.5,
                elevation: 2,
              }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#059669" }}>
                  {room.restaurantName}
                </Text>
              </View>

              {/* 초록색 마커 핀 (아래) */}
              <MapPin size={24} color="#10b981" fill="#10b981" />
            </View>
          </GoogleMarker>
        ))}
    </MapView>
  );
}
