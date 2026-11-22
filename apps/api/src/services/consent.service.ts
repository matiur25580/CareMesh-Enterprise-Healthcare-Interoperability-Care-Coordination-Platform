import { ConsentModel, CONSENT_PURPOSES } from "../models/consent.model.js";

export type ConsentPurpose = typeof CONSENT_PURPOSES[number];

export function parseConsentPurpose(value: unknown): ConsentPurpose | null {
  return typeof value === "string" && (CONSENT_PURPOSES as readonly string[]).includes(value)
    ? value as ConsentPurpose
    : null;
}

export async function hasActiveConsent(input: {
  organizationId: string;
  patientId: string;
  purpose: ConsentPurpose;
  at?: Date;
}): Promise<boolean> {
  const at = input.at ?? new Date();
  const consent = await ConsentModel.exists({
    organizationId: input.organizationId,
    patientId: input.patientId,
    status: "active",
    purposes: input.purpose,
    effectiveAt: { $lte: at },
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: at } }]
  });
  return Boolean(consent);
}
