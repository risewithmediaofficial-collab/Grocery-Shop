import React from 'react';
import {
  Wheat,
  Coffee,
  ShoppingBag,
  Package,
  Droplets,
  Tag,
  Sparkles,
  Utensils,
  Cookie,
  Layers,
  Flame,
} from 'lucide-react';

const ICON_MAP = {
  'all': Layers,
  'rice & grains': Wheat,
  'dal & pulses': Wheat,
  'flour & atta': Wheat,
  'cooking oil & ghee': Droplets,
  'sugar & salt': Sparkles,
  'spices & masala': Flame,
  'packaged water': Droplets,
  'tea & coffee': Coffee,
  'cold drinks & juices': Coffee,
  'dairy & milk': Package,
  'biscuits & cookies': Cookie,
  'chips & namkeen': Package,
  'noodles & instant food': Utensils,
  'chocolates & sweets': Cookie,
  'soaps & body wash': Sparkles,
  'detergents & fabric care': Package,
  'oral care': Sparkles,
  'dishwash & cleaners': Sparkles,
  'food essentials': Wheat,
  'food & staples': Wheat,
  'food': Wheat,
  'packaged snacks': Cookie,
  'snacks & biscuits': Cookie,
  'snacks': Cookie,
  'packaged beverages': Coffee,
  'beverages & dairy': Coffee,
  'beverages': Coffee,
  'household essentials': Package,
  'personal & household care': Package,
  'personal care': Sparkles,
  'household': Package,
  'general grocery': ShoppingBag,
};

export default function CategoryIcon({ name, size = 15, className = '' }) {
  if (!name) return <Tag size={size} className={className} />;
  const normalized = String(name).toLowerCase().trim();
  const IconComponent = ICON_MAP[normalized] || Tag;
  return <IconComponent size={size} className={className} />;
}
