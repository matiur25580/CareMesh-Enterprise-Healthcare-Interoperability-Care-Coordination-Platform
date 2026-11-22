import { Schema, model } from "mongoose";
const auditEventSchema = new Schema({
  actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  action: { type: String, required: true, maxlength: 120 },
  resourceType: { type: String, required: true, maxlength: 80 },
  resourceId: { type: String, maxlength: 120 },
  outcome: { type: String, enum: ["success", "denied"], required: true },
  requestId: { type: String, maxlength: 120 },
  occurredAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { versionKey: false, strict: "throw" });
auditEventSchema.index({ organizationId: 1, occurredAt: -1 });
auditEventSchema.index({ actorUserId: 1, occurredAt: -1 });
export const AuditEventModel = model("AuditEvent", auditEventSchema);
