import type { DemoVoucher } from "./types";

type VoucherStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function buildDemoVoucher(eventId: string): DemoVoucher {
  return {
    eventId,
    title: "Free coffee on the Terrace",
    code: "BONAFLOW-DEMO",
    terms: "One demo voucher per browser · Hackathon prototype",
  };
}

export function voucherStorageKey(eventId: string): string {
  return `bonaflow:voucher:${eventId}`;
}

export function loadStoredVoucher(
  storage: Pick<VoucherStorage, "getItem">,
  eventId: string,
): DemoVoucher | null {
  try {
    const raw = storage.getItem(voucherStorageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoVoucher>;
    const expected = buildDemoVoucher(eventId);
    return JSON.stringify(parsed) === JSON.stringify(expected)
      ? expected
      : null;
  } catch {
    return null;
  }
}

export function storeVoucher(
  storage: Pick<VoucherStorage, "setItem">,
  voucher: DemoVoucher,
): boolean {
  try {
    storage.setItem(
      voucherStorageKey(voucher.eventId),
      JSON.stringify(voucher),
    );
    return true;
  } catch {
    return false;
  }
}
