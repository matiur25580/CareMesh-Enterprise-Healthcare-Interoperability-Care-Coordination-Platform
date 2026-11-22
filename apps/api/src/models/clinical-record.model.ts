import { Schema, model } from "mongoose";

const clinicalRecordSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  resourceType: { type: String, enum: ["condition", "allergy_intolerance", "medication_statement", "observation", "procedure", "encounter", "clinical_note"], required: true },
  code: {
    system: { type: String, trim: true, maxlength: 200 },
    value: { type: String, trim: true, maxlength: 100 },
    display: { type: String, required: true, trim: true, maxlength: 240 }
  },
  status: { type: String, enum: ["active", "inactive", "resolved", "entered_in_error"], default: "active", required: true },
  effectiveAt: { type: Date, required: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  note: { type: String, trim: true, maxlength: 4000 }
}, { timestamps: true, versionKey: false });
clinicalRecordSchema.index({ organizationId: 1, patientId: 1, effectiveAt: -1 });
export const ClinicalRecordModel = model("ClinicalRecord", clinicalRecordSchema);
