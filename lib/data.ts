import cardsJson from "@/data/cards.json";
import purchasesJson from "@/data/purchases.json";
import bindersJson from "@/data/binders.json";
import type { Card } from "./cards";
import type { PurchaseData } from "./purchases";
import type { Binder } from "./binders";
import { validateData } from "./binders";

export const cards: Card[] = cardsJson as Card[];
export const purchases: PurchaseData = purchasesJson as PurchaseData;
export const binders: Binder[] = bindersJson as Binder[];

const problems = validateData(cards, purchases, binders);
if (problems.length > 0) {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(problems.join("\n"));
  }
  for (const p of problems) console.error(p);
}
