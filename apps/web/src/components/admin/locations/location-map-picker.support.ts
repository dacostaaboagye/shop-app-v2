export type LocationMapPickerValue = {
  address: string;
  latitude: number;
  longitude: number;
};

export type LocationMapPickerProps = {
  onChange: (value: LocationMapPickerValue | null) => void;
  value?: {
    address?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
  };
};

export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const DEFAULT_CENTER = { latitude: 5.6037, longitude: -0.187 };

export const DEFAULT_ZOOM = 12;
