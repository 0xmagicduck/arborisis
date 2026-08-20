import { z } from "zod";

/**
 * Signalement de contenu — voir plan/10-securite-confidentialite-conformite.md §10.3.
 * Pas de rôle "admin" en base ; la revue passe par des routes API restreintes
 * aux handles listés dans ADMIN_HANDLES (apps/api/src/lib/admin.ts), pas par
 * un écran d'administration dédié (aucun mockup design/system pour ça).
 */
export const reportReasonSchema = z.enum(["illegal_content", "off_topic", "spam", "other"]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const reportStatusSchema = z.enum(["open", "resolved", "dismissed"]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const createReportInputSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().max(1000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportInputSchema>;

export const reportSchema = z.object({
  id: z.string().uuid(),
  recordingId: z.string().uuid(),
  recordingTitle: z.string(),
  reporterId: z.string().uuid(),
  reporterHandle: z.string(),
  reason: reportReasonSchema,
  details: z.string().nullable(),
  status: reportStatusSchema,
  createdAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
});
export type Report = z.infer<typeof reportSchema>;

export const updateReportStatusInputSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
});
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusInputSchema>;
