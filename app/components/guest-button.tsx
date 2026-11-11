"use client";

import { useAuth } from "@/lib/auth-context";

export default function GuestButton() {
  const { signInAsGuest } = useAuth();

  return (
    <button onClick={signInAsGuest} className="guest-btn">
      Continue as Guest
    </button>
  );
}
