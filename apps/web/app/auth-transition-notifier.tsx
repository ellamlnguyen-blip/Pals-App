"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  announceCompletedAuthCallback,
  settleAuthTransition,
} from "./auth-transition";

export function AuthTransitionNotifier() {
  const pathname = usePathname();
  useEffect(() => {
    const notify = () => {
      settleAuthTransition();
      const url = new URL(window.location.href);
      if (url.searchParams.has("pals_auth_done")) {
        url.searchParams.delete("pals_auth_done");
        window.history.replaceState(window.history.state, "", url);
      }
      if (url.searchParams.get("pals_auth_callback") === "1") {
        announceCompletedAuthCallback();
        url.searchParams.delete("pals_auth_callback");
        window.history.replaceState(window.history.state, "", url);
      }
    };
    notify();
    const onPageShow = () => notify();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [pathname]);
  return null;
}
