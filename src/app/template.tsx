"use client";

import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="ios-page-transition w-full min-h-full">
      {children}
    </div>
  );
}
