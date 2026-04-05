"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Suspense } from "react";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email") ?? undefined;
    const name = searchParams.get("name") ?? undefined;
    if (token) {
      loginWithToken(token, email, name);
    }
  }, [searchParams, loginWithToken]);

  return (
    <div className="flex min-h-full items-center justify-center">
      <p className="text-muted">Авторизация...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full items-center justify-center"><p className="text-muted">Загрузка...</p></div>}>
      <CallbackHandler />
    </Suspense>
  );
}
