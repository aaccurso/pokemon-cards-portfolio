import cardsJson from "@/data/cards.json";
import purchasesJson from "@/data/purchases.json";
import type { Card } from "./cards";
import type { PurchaseData } from "./purchases";

export const cards: Card[] = cardsJson as Card[];
export const purchases: PurchaseData = purchasesJson as PurchaseData;
