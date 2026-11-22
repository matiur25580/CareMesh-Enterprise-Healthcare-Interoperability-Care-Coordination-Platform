import { Schema, model } from "mongoose";

const careGapSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  category: { type: String, enum: ["screening", "medication_review", "follow_up", "care_plan", "preventive_care", "other"], required: true },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  priority: { type: String, enum: ["routine", "soon", "urgent"], default: "routine", required: true },
  dueAt: { type: Date, required: true },
  status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open", required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolutionNote: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true, versionKey: false });

careGapSchema.index({ organizationId: 1, patientId: 1, status: 1, dueAt: 1 });
careGapSchema.index({ organizationId: 1, status: 1, priority: 1, dueAt: 1 });
export const CareGapModel = model("CareGap", careGapSchema);
