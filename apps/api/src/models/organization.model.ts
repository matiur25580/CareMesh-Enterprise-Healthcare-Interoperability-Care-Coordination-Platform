import { Schema, model } from "mongoose";
const organizationSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ["hospital", "clinic", "laboratory", "pharmacy", "payer", "care_network"], required: true },
  status: { type: String, enum: ["active", "pending", "suspended"], default: "active", required: true }
}, { timestamps: true, versionKey: false });
export const OrganizationModel = model("Organization", organizationSchema);
