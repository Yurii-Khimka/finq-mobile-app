import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<string, IconName> = {
  // Mandatory
  rent: 'home-outline',
  utilities: 'flash-outline',
  groceries: 'cart-outline',
  transport: 'bus-outline',
  health: 'medkit-outline',
  insurance: 'shield-outline',
  phone: 'call-outline',
  internet: 'wifi-outline',

  // Non-mandatory
  dining: 'restaurant-outline',
  entertainment: 'game-controller-outline',
  clothing: 'shirt-outline',
  subscriptions: 'card-outline',
  gifts: 'gift-outline',
  coffee: 'cafe-outline',
  personal: 'person-outline',
  beauty: 'sparkles-outline',

  // Investments
  stocks: 'trending-up-outline',
  crypto: 'logo-bitcoin',
  savings: 'wallet-outline',

  // Dreams
  travel: 'airplane-outline',
  gadgets: 'laptop-outline',
  education: 'school-outline',
};

const DEFAULT_ICON: IconName = 'pricetag-outline';

export function getCategoryIcon(categoryName: string): IconName {
  return CATEGORY_ICONS[categoryName.toLowerCase()] ?? DEFAULT_ICON;
}
