"use server";

import fs from "node:fs/promises";
import path from "node:path";
import type { Shipment } from "@/lib/purchases";

const PURCHASES_PATH = path.join(process.cwd(), "data/purchases.json");

export async function appendShipments(newShipments: Shipment[]): Promise<{
  ok: boolean;
  appended: number;
  error?: string;
}> {
  try {
    const raw = await fs.readFile(PURCHASES_PATH, "utf-8");
    const data = JSON.parse(raw) as { shipments: Shipment[] };

    const existingIds = new Set(data.shipments.map((s) => s.id));
    const filtered = newShipments.filter((s) => !existingIds.has(s.id));

    data.shipments.push(...filtered);
    await fs.writeFile(
      PURCHASES_PATH,
      JSON.stringify(data, null, 2) + "\n",
      "utf-8"
    );

    return { ok: true, appended: filtered.length };
  } catch (e) {
    return { ok: false, appended: 0, error: (e as Error).message };
  }
}
