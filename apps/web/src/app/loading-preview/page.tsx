"use client";

import React, { useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Button } from "@/components/ui/button";
import { RotateCw, Shield, User } from "lucide-react";

export default function LoadingPreviewPage() {
  const [mode, setMode] = useState<"user" | "superadmin">("user");
  const [key, setKey] = useState(0);

  const handleRestart = (newMode: "user" | "superadmin") => {
    setMode(newMode);
    setKey((prev) => prev + 1);
  };

  return (
    <main className="relative min-h-screen bg-white">
      {/* Loading Screen Overlay */}
      <LoadingScreen
        key={key}
        isSuperAdmin={mode === "superadmin"}
        isLoading={false}
        minDurationMs={3200}
      />

      {/* Background Dashboard Mock (revealed once loading finishes) */}
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4 rounded-2xl border bg-gray-50/50 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "superadmin" ? "Platform Administration" : "Main Dashboard"} Loaded!
          </h1>
          <p className="text-sm text-gray-500">
            The loading screen has completed its sequence and smoothly transitioned to the dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              onClick={() => handleRestart("user")}
              variant="primary"
              className="gap-2 bg-[#00C268] hover:bg-[#00A859] text-white"
            >
              <User size={16} />
              Replay User Loading
            </Button>
            <Button
              onClick={() => handleRestart("superadmin")}
              variant="outline"
              className="gap-2"
            >
              <Shield size={16} />
              Replay Super Admin
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
