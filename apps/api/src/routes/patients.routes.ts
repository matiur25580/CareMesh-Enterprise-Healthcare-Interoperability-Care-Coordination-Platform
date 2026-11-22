import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PatientModel } from "../models/patient.model.js";
import { ClinicalRecordModel } from "../models/clinical-record.model.js";

export const patientsRouter = Router();
patientsRouter.use(authenticate);

const identifierSchema = z.object({ system: z.string().trim().min(1).max(120), value: z.string().trim().min(1).max(120) });
const patientInput = z.object({
  medicalRecordNumber: z.string().trim().min(1).max(64),
  identifiers: z.array(identifierSchema).max(20).default([]),
  name: z.object({ given: z.array(z.string().trim().min(1).max(80)).min(1).max(5), family: z.string().trim().min(1).max(100) }),
  birthDate: z.coerce.date(),
  administrativeGender: z.enum(["female", "male", "other", "unknown"]).default("unknown"),
  telecom: z.object({ email: z.string().email().max(254).optional(), phone: z.string().max(32).optional() }).optional(),
  address: z.object({
    line: z.array(z.string().max(160)).max(4).optional(), city: z.string().max(100).optional(),
    region: z.string().max(100).optional(), postalCode: z.string().max(20).optional(), country: z.string().length(2).optional()
  }).optional()
});
const recordInput = z.object({
  resourceType: z.enum(["condition", "allergy_intolerance", "medication_statement", "observation", "procedure", "encounter", "clinical_note"]),
  code: z.object({ system: z.string().max(200).optional(), value: z.string().max(100).optional(), display: z.string().trim().min(1).max(240) }),
  status: z.enum(["active", "inactive", "resolved", "entered_in_error"]).default("active"),
  effectiveAt: z.coerce.date(),
  note: z.string().max(4000).optional()
});
const objectId = (value: string) => Types.ObjectId.isValid(value);
const routePatientId = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

patientsRouter.post("/", authorize("owner", "admin", "clinician", "coordinator"), async (req, res, next) => {
  try {
    const input = patientInput.parse(req.body);
    const duplicate = await PatientModel.findOne({
      organizationId: req.auth!.tenantId,
      $or: [
        { medicalRecordNumber: input.medicalRecordNumber },
        ...input.identifiers.map((identifier) => ({ identifiers: { $elemMatch: identifier } }))
      ]
    }).select("_id medicalRecordNumber");
    if (duplicate) {
      res.status(409).json({ error: { code: "PATIENT_IDENTITY_CONFLICT", message: "A patient with this medical record number or identifier already exists in this organization.", patientId: duplicate.id } });
      return;
    }
    const patient = await PatientModel.create({
      ...input, organizationId: req.auth!.tenantId, createdBy: req.auth!.userId, updatedBy: req.auth!.userId
    });
    res.status(201).json({ data: patient });
  } catch (error) { next(error); }
});

patientsRouter.get("/", async (req, res, next) => {
  try {
    const query = z.object({
      q: z.string().trim().max(120).optional(),
      status: z.enum(["active", "inactive", "merged"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().optional()
    }).parse(req.query);
    const filter: Record<string, unknown> = { organizationId: req.auth!.tenantId };
    if (query.status) filter.status = query.status;
    if (query.q) {
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { medicalRecordNumber: { $regex: escaped, $options: "i" } },
        { "name.family": { $regex: escaped, $options: "i" } },
        { "name.given": { $regex: escaped, $options: "i" } },
        { "telecom.email": { $regex: escaped, $options: "i" } }
      ];
    }
    if (query.cursor) {
      if (!objectId(query.cursor)) {
        res.status(400).json({ error: { code: "INVALID_CURSOR", message: "The pagination cursor is invalid." } });
        return;
      }
      filter._id = { $lt: new Types.ObjectId(query.cursor) };
    }
    const items = await PatientModel.find(filter).sort({ _id: -1 }).limit(query.limit + 1).lean();
    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    res.json({ data: page, page: { hasMore, nextCursor: hasMore ? String(page[page.length - 1]?._id) : null } });
  } catch (error) { next(error); }
});

patientsRouter.get("/:patientId", async (req, res, next) => {
  try {
    const patientId = routePatientId(patientId);
    if (!patientId || !objectId(patientId)) {
      res.status(400).json({ error: { code: "INVALID_PATIENT_ID", message: "The patient identifier is invalid." } });
      return;
    }
    const patient = await PatientModel.findOne({ _id: patientId, organizationId: req.auth!.tenantId }).lean();
    if (!patient) {
      res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: "The patient was not found in the active organization." } });
      return;
    }
    res.json({ data: patient });
  } catch (error) { next(error); }
});

patientsRouter.patch("/:patientId", authorize("owner", "admin", "clinician", "coordinator"), async (req, res, next) => {
  try {
    if (!objectId(patientId)) {
      res.status(400).json({ error: { code: "INVALID_PATIENT_ID", message: "The patient identifier is invalid." } });
      return;
    }
    const changes = patientInput.partial().omit({ medicalRecordNumber: true }).parse(req.body);
    const patient = await PatientModel.findOneAndUpdate(
      { _id: patientId, organizationId: req.auth!.tenantId },
      { $set: { ...changes, updatedBy: req.auth!.userId } },
      { new: true, runValidators: true }
    );
    if (!patient) {
      res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: "The patient was not found in the active organization." } });
      return;
    }
    res.json({ data: patient });
  } catch (error) { next(error); }
});

patientsRouter.get("/:patientId/records", async (req, res, next) => {
  try {
    if (!objectId(patientId)) {
      res.status(400).json({ error: { code: "INVALID_PATIENT_ID", message: "The patient identifier is invalid." } });
      return;
    }
    const patient = await PatientModel.exists({ _id: patientId, organizationId: req.auth!.tenantId });
    if (!patient) {
      res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: "The patient was not found in the active organization." } });
      return;
    }
    const records = await ClinicalRecordModel.find({ patientId: patientId, organizationId: req.auth!.tenantId }).sort({ effectiveAt: -1 }).limit(100).lean();
    res.json({ data: records });
  } catch (error) { next(error); }
});

patientsRouter.post("/:patientId/records", authorize("owner", "admin", "clinician"), async (req, res, next) => {
  try {
    if (!objectId(patientId)) {
      res.status(400).json({ error: { code: "INVALID_PATIENT_ID", message: "The patient identifier is invalid." } });
      return;
    }
    const input = recordInput.parse(req.body);
    const patient = await PatientModel.exists({ _id: patientId, organizationId: req.auth!.tenantId, status: "active" });
    if (!patient) {
      res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: "The active patient was not found in this organization." } });
      return;
    }
    const record = await ClinicalRecordModel.create({
      ...input, patientId: patientId, organizationId: req.auth!.tenantId, recordedBy: req.auth!.userId
    });
    res.status(201).json({ data: record });
  } catch (error) { next(error); }
});
