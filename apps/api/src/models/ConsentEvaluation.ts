import { Schema, model, models, type Model } from "mongoose";
const consentEvaluationSchema = new Schema({
  tenantId: { type: String, required: true, trim: true, maxlength: 120 },
  actorUserId: { type: String, required: true, maxlength: 120 },
  requestedPurpose: { type: String, required: true, maxlength: 120 },
  consentStatus: { type: String, enum: ["active", "revoked", "expired", "unknown"], required: true },
  decision: { type: String, enum: ["allow", "deny"], required: true },
  reasons: { type: [{ type: String, maxlength: 80 }], default: [] },
  evaluatedAt: { type: Date, required: true }
}, { timestamps: true, strict: "throw", versionKey: false });
// No subject identifier or clinical payload is stored in this synthetic-only audit trail.
consentEvaluationSchema.index({ tenantId: 1, evaluatedAt: -1 });
consentEvaluationSchema.index({ tenantId: 1, decision: 1, evaluatedAt: -1 });
const existingModel = models.ConsentEvaluation as Model<any> | undefined;
export const ConsentEvaluation: Model<any> = existingModel ?? model<any>("ConsentEvaluation", consentEvaluationSchema);