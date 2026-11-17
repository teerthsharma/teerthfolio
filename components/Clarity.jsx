"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { clarityId, clarityLoader, shouldLoadClarity } from "../lib/clarity";

/* global process */
const ID =process.env.NEXT_PUBLIC_CLARITY_ID;

export default function Clarity() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(shouldLoadClarity(ID, navigator, window)), []);
  if (!on) return null;
  return <Script id="clarity" strategy="afterInteractive">{clarityLoader(clarityId(ID))}</Script>;
}
