import { ConsentModel, CONSENT_PURPOSES } from "../models/consent.model.js";

export type ConsentPurpose = typeof CONSENT_PURPOSES[number];
export type ConsentAuthorizationState = "active" | "scheduled" | "expired" | "revoked" | "invalid";

export function parseConsentPurpose(value: unknown): ConsentPurpose | null {
  return typeof value === "string" && (CONSENT_PURPOSES as readonly string[]).includes(value)
    ? value as ConsentPurpose
    : null;
}

export function getConsentAuthorizationState(
  consent: { status: "active" | "revoked"; effectiveAt: Date | string; expiresAt?: Date | string | null; revokedAt?: Date | string | null },
  at: Date = new Date()
): ConsentAuthorizationState {
  if (consent.status === "revoked" || consent.revokedAt) return "revoked";
  const effectiveAt = new Date(consent.effectiveAt);
  const expiresAt = consent.expiresAt ? new Date(consent.expiresAt) : null;
  if (Number.isNaN(effectiveAt.getTime()) || (expiresAt && Number.isNaN(expiresAt.getTime()))) return "invalid";
  if (effectiveAt.getTime() > at.getTime()) return "scheduled";
  if (expiresAt && expiresAt.getTime() <= at.getTime()) return "expired";
  return "active";
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
