"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchSettings } from "./settings";
import type { ShopSettings } from "./types";

type ShopValue = {
  settings: ShopSettings | null;
  reload: () => void;
};

const ShopContext = createContext<ShopValue>({
  settings: null,
  reload: () => {},
});

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchSettings().then(
      (row) => {
        if (!cancelled) setSettings(row);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setKey((value) => value + 1), []);
  const value = useMemo(() => ({ settings, reload }), [settings, reload]);

  return <ShopContext value={value}>{children}</ShopContext>;
}

export function useShop() {
  return useContext(ShopContext);
}
