declare module 'react-native-nmap' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface Coord {
    latitude: number;
    longitude: number;
  }

  export interface MarkerProps {
    coordinate: Coord;
    caption?: {
      text?: string;
      textSize?: number;
      color?: string;
      haloColor?: string;
    };
    pinColor?: string;
    onClick?: () => void;
    image?: any;
  }

  export interface NaverMapViewProps extends ViewProps {
    center?: Coord & { zoom?: number };
    showsMyLocationButton?: boolean;
    onCameraChange?: (event: { latitude: number; longitude: number; zoom: number }) => void;
    onMapClick?: (event: { latitude: number; longitude: number }) => void;
    markers?: MarkerProps[];
    children?: React.ReactNode;
  }

  export default class NaverMapView extends Component<NaverMapViewProps> {}
  export class Marker extends Component<MarkerProps> {}
}
