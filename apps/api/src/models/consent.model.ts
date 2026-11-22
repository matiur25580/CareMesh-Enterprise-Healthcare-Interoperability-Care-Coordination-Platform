import { Schema, model } from "mongoose";

export const CONSENT_PURPOSES = ["treatment", "payment", "operations"] as const;
const consentSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  status: { type: String, enum: ["active", "revoked"], required: true, default: "active" },
  purposes: { type: [String], enum: CONSENT_PURPOSES, required: true },
  effectiveAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date },
  grantedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  revokedAt: { type: Date },
  revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
  source: { type: String, enum: ["patient", "legal_representative", "authorized_delegate", "synthetic_test"], required: true },
  reference: { type: String, trim: true, maxlength: 120 }
}, { timestamps: true, versionKey: false, strict: "throw" });
consentSchema.index({ organizationId: 1, patientId: 1, status: 1, effectiveAt: 1, expiresAt: 1 });
export const ConsentModel = model("Consent", consentSchema);
