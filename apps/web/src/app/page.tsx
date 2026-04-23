"use client";

import { HomeFeatures } from "@/components/home/home-features";
import { HomeCTA, HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { HomeHero } from "@/components/home/home-hero";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10">
      <HomeHeader />

      <main className="flex-1">
        <HomeHero />
        <HomeFeatures />
        <HomeCTA />
      </main>

      <HomeFooter />
    </div>
  );
}
