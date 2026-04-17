export const registerDefaults = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
};

export function validateRegisterEmail(value: string) {
  if (!value.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "Enter a valid email address.";
  return undefined;
}

export function validateName(value: string, part: "first" | "last") {
  if (!value.trim()) return `Enter your ${part} name.`;
  return undefined;
}

export function validateRegisterPassword(value: string) {
  if (!value.trim()) return "Create a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}
