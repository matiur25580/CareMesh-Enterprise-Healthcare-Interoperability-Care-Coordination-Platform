import { Schema, model } from "mongoose";

const patientIdentifierSchema = new Schema({
  system: { type: String, required: true, trim: true, maxlength: 120 },
  value: { type: String, required: true, trim: true, maxlength: 120 }
}, { _id: false });

const patientSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  medicalRecordNumber: { type: String, required: true, trim: true, maxlength: 64 },
  identifiers: { type: [patientIdentifierSchema], default: [] },
  name: {
    given: { type: [String], required: true },
    family: { type: String, required: true, trim: true, maxlength: 100 }
  },
  birthDate: { type: Date, required: true },
  administrativeGender: { type: String, enum: ["female", "male", "other", "unknown"], default: "unknown" },
  telecom: {
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 32 }
  },
  address: {
    line: { type: [String], default: [] },
    city: { type: String, trim: true, maxlength: 100 },
    region: { type: String, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    country: { type: String, trim: true, maxlength: 2 }
  },
  status: { type: String, enum: ["active", "inactive", "merged"], default: "active", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true, versionKey: false });

patientSchema.index({ organizationId: 1, medicalRecordNumber: 1 }, { unique: true });
patientSchema.index({ organizationId: 1, "identifiers.system": 1, "identifiers.value": 1 });
patientSchema.index({ organizationId: 1, "name.family": 1, birthDate: 1 });
export const PatientModel = model("Patient", patientSchema);
