"use client";

import { CATEGORIES } from "@/lib/categories";
import CategoryIcon from "./CategoryIcon";
import type { Product } from "@/lib/types";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  productCounts?: Record<string, number>;
  products?: Product[];
}

export default function CategoryFilter({ selected, onSelect, productCounts = {} }: Props) {
  return (
    <div className="kp-cat-scroll">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        const count = productCounts[cat.id];
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`kp-cat-pill ${isActive ? "active" : ""}`}
          >
            <CategoryIcon category={cat.id} size={14} />
            <span>{cat.name}</span>
            {count !== undefined && (
              <span className="kp-cat-count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
