import { Schema, model, type InferSchemaType } from "mongoose";
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ["active", "disabled"], default: "active", required: true }
}, { timestamps: true, versionKey: false });
export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
