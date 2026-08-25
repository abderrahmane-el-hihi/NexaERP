"use client";
import { useEffect } from "react";

export default function PrintTrigger() {
  useEffect(() => {
    // Small delay to ensure fonts/layout are loaded before triggering print dialog
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  return null;
}
