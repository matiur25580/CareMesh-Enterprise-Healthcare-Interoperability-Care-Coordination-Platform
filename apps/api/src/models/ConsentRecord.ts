import { Schema, model, models } from "mongoose";

const consentRecordSchema = new Schema({
  // These opaque references are not patient names, MRNs, or clinical data.
  // Resolve them only inside a future authenticated, tenant-scoped service.
  tenantId: { type: String, required: true, trim: true, maxlength: 120 },
  subjectRef: { type: String, required: true, trim: true, maxlength: 180 },
  consentStatus: {
    type: String,
    enum: ["active", "revoked", "expired", "unknown"],
    required: true
  },
  permittedPurposes: {
    type: [{ type: String, trim: true, maxlength: 120 }],
    default: [],
    validate: (values: string[]) => values.length <= 50
  },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  sourceSystem: { type: String, maxlength: 120 },
  sourceRecordRef: { type: String, maxlength: 180 },
  recordedBy: { type: String, maxlength: 180 }
}, {
  timestamps: true,
  strict: "throw",
  versionKey: false
});

// Subject references are always queried with tenant scope to prevent
// cross-organization disclosure in this multi-tenant domain.
consentRecordSchema.index({ tenantId: 1, subjectRef: 1, createdAt: -1 });
consentRecordSchema.index({ tenantId: 1, consentStatus: 1, validUntil: 1 });

export const ConsentRecord = models.ConsentRecord ?? model("ConsentRecord", consentRecordSchema);