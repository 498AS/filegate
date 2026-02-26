import { useMemo } from "react";
import { FilegateClient } from "@filegate/sdk";
import { useAuth } from "./use-auth";

export function useClient(): FilegateClient | null {
  const { token } = useAuth();

  return useMemo(() => {
    if (!token) return null;
    return new FilegateClient({
      url: window.location.origin,
      token,
    });
  }, [token]);
}
