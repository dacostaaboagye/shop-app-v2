import type { SeedBrand, SeedCategory } from "./catalog-seed-types.js";

export const catalogSeedCategories = [
  {
    slug: "bags",
    name: "Bags",
    description: "Core bag catalog used for daily carry, work, and travel.",
    parentSlug: null,
  },
  {
    slug: "tote-bags",
    name: "Tote Bags",
    description: "Open-top and zip-top totes for errands, office use, and light travel.",
    parentSlug: "bags",
  },
  {
    slug: "crossbody-bags",
    name: "Crossbody Bags",
    description: "Compact hands-free bags designed for everyday essentials.",
    parentSlug: "bags",
  },
  {
    slug: "laptop-bags",
    name: "Laptop Bags",
    description: "Structured bags built to protect laptops and daily work gear.",
    parentSlug: "bags",
  },
  {
    slug: "travel-bags",
    name: "Travel Bags",
    description: "Duffels and carry solutions sized for short trips and weekend travel.",
    parentSlug: "bags",
  },
] satisfies SeedCategory[];

export const catalogSeedBrands = [
  {
    slug: "evercarry",
    name: "EverCarry",
    description: "Bag brand focused on durable carry goods for daily city use.",
    website: "https://example.com/evercarry",
  },
  {
    slug: "nomad-lane",
    name: "Nomad Lane",
    description: "Travel-led bag brand with structured storage and commuter features.",
    website: "https://example.com/nomad-lane",
  },
  {
    slug: "cedar-thread",
    name: "Cedar Thread",
    description: "Lifestyle bag label with lightweight silhouettes and soft-touch finishes.",
    website: "https://example.com/cedar-thread",
  },
  {
    slug: "harbor-house",
    name: "Harbor House",
    description: "Canvas and leather bag maker for weekend, travel, and utility carry.",
    website: "https://example.com/harbor-house",
  },
] satisfies SeedBrand[];

