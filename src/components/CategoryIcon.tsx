import React from "react";
import {
  LayoutGrid,
  Wheat,
  Flame,
  Soup,
  Cookie,
  Egg,
  UtensilsCrossed,
  Coffee,
  Sparkles,
  Droplets,
  Cigarette,
  Package,
  LucideProps,
} from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

interface CategoryIconProps extends LucideProps {
  name?: string;
  category?: string;
}

export default function CategoryIcon({ name, category, ...props }: CategoryIconProps) {
  let iconName = name;
  if (!iconName && category) {
    const found = CATEGORIES.find((c) => c.id === category);
    iconName = found ? found.icon : "Package";
  }

  switch (iconName) {
    case "LayoutGrid":
      return <LayoutGrid {...props} />;
    case "Wheat":
      return <Wheat {...props} />;
    case "Flame":
      return <Flame {...props} />;
    case "Soup":
      return <Soup {...props} />;
    case "Cookie":
      return <Cookie {...props} />;
    case "Egg":
      return <Egg {...props} />;
    case "UtensilsCrossed":
      return <UtensilsCrossed {...props} />;
    case "Coffee":
      return <Coffee {...props} />;
    case "Sparkles":
      return <Sparkles {...props} />;
    case "Droplets":
      return <Droplets {...props} />;
    case "Cigarette":
      return <Cigarette {...props} />;
    default:
      return <Package {...props} />;
  }
}
