import { useEffect, useRef, useState } from "react";

export function useResource<T>(key: string, loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    if (version === 0) {
      setLoading(true);
    }
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Request failed");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, version]);

  return {
    data,
    error,
    loading,
    reload: () => setVersion((value) => value + 1),
  };
}
