import { Schema, model, models, type Model } from "mongoose";

export const CAREMESH_ROLES = ["platform-admin", "organization-admin", "clinician", "care-coordinator", "patient", "auditor"] as const;

const userSchema = new Schema({
  tenantId: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: CAREMESH_ROLES, required: true },
  active: { type: Boolean, default: true, required: true }
}, { timestamps: true, strict: "throw", versionKey: false });

// A user's email is unique within an organization boundary.
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

const existingUserModel = models.User as Model<any> | undefined;
export const User: Model<any> = existingUserModel ?? model<any>("User", userSchema);