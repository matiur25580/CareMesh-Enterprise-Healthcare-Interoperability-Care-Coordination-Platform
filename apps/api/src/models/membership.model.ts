import { Schema, model } from "mongoose";
const membershipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  role: { type: String, enum: ["owner", "admin", "clinician", "coordinator", "analyst", "member"], required: true },
  status: { type: String, enum: ["active", "invited", "suspended"], default: "active", required: true }
}, { timestamps: true, versionKey: false });
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
export const MembershipModel = model("Membership", membershipSchema);
