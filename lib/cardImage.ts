import { Card } from "./cards";

export function getCardImageUrl(card: Card): string | null {
  return card.imageUrl ?? null;
}
