"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeButtonProps {
  priceId: string;
  label: string;
  variant?: "highlight" | "default";
  className?: string;
}

export function UpgradeButton({
  priceId,
  label,
  variant = "default",
  className,
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      // Grab the session ID from localStorage if available
      let userId = "";
      if (typeof window !== "undefined") {
        userId = localStorage.getItem("schemashift_session_id") || "";
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Checkout error:", data.error);
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  }

  const isHighlight = variant === "highlight";

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={`w-full rounded-xl py-5 font-semibold transition-all duration-300 ${
        isHighlight
          ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
      } ${className || ""}`}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
