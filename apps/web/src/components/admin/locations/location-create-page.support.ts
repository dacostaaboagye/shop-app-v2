import type { AdminCreateLocationRequest } from "@shop/contracts";

export type LocationCreateFormValues = {
  address: string;
  isFulfilmentEnabled: boolean;
  latitude: number | undefined;
  longitude: number | undefined;
  name: string;
  status: "active" | "inactive";
  type: "" | "store" | "warehouse";
};

export const DEFAULT_LOCATION_CREATE_VALUES: LocationCreateFormValues = {
  address: "",
  isFulfilmentEnabled: false,
  latitude: undefined,
  longitude: undefined,
  name: "",
  status: "active",
  type: "",
};

export function toCreateLocationRequest(
  value: LocationCreateFormValues,
): AdminCreateLocationRequest {
  if (!value.type) {
    throw new Error("Location type is required.");
  }

  return {
    ...(value.address ? { address: value.address } : {}),
    isFulfilmentEnabled: value.isFulfilmentEnabled,
    ...(value.latitude != null ? { latitude: value.latitude } : {}),
    ...(value.longitude != null ? { longitude: value.longitude } : {}),
    name: value.name.trim(),
    status: value.status,
    type: value.type,
  };
}
