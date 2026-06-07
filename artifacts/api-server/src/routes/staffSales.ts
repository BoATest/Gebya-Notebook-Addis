import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  DatabaseNotConfiguredError,
  StaffSaleEventConflictError,
  listStaffSaleEvents,
  persistStaffSaleEvent,
  type ListedStaffSaleEvent,
  type PersistedStaffSaleEvent,
  type StaffSaleEventInput,
} from "../services/staffSaleEventStore.js";

export const staffSaleEventSchema = z.object({
  event_id: z.string().min(8),
  transaction_id: z.string().min(8),
  shop_id: z.string().min(1),
  staff_id: z.string().min(1),
  staff_name_snapshot: z.string().min(1),
  device_id: z.string().min(6),
  amount: z.number().finite().nonnegative(),
  item_note: z.string().nullable().optional(),
  item_code: z.string().nullable().optional(),
  payment_type: z.string().nullable().optional(),
  created_at_device: z.number().finite().positive(),
  event_type: z.enum(["sale_created", "sale_voided", "correction"]).default("sale_created"),
  sync_status: z.enum(["pending_sync", "synced", "failed"]),
  schema_version: z.number().int().positive(),
});

export type StaffSaleEventStore = {
  persist(event: StaffSaleEventInput): Promise<PersistedStaffSaleEvent>;
  list(options: { shopId: string; limit?: number; since?: Date | null; staffId?: string | null }): Promise<ListedStaffSaleEvent[]>;
};

const defaultStore: StaffSaleEventStore = {
  persist: persistStaffSaleEvent,
  list: listStaffSaleEvents,
};

const listQuerySchema = z.object({
  shop_id: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  since: z.string().datetime().optional(),
  staff_id: z.string().trim().min(1).optional(),
});

function validationError(res: Response, issues: z.ZodIssue[]) {
  return res.status(400).json({
    accepted: false,
    error: "Invalid staff sale event payload",
    issues: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export function createStaffSalesRouter(store: StaffSaleEventStore = defaultStore) {
  const router = Router();

  router.get("/events", async (req: Request, res: Response) => {
    // Phase 2C demo endpoint: shop_id scoping prevents accidental all-shop
    // reads, but this is not production authentication or authorization.
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        accepted: false,
        error: "shop_id is required to fetch staff sale events.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const events = await store.list({
        shopId: parsed.data.shop_id,
        limit: parsed.data.limit || 20,
        since: parsed.data.since ? new Date(parsed.data.since) : null,
        staffId: parsed.data.staff_id || null,
      });
      return res.status(200).json({
        accepted: true,
        shop_id: parsed.data.shop_id,
        events,
        security_note: "Demo unauthenticated endpoint. Do not use as production staff security.",
      });
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) {
        return res.status(503).json({
          accepted: false,
          error: error.message,
          required_env: "DATABASE_URL",
        });
      }

      console.error("[staff-sales:list]", error);
      return res.status(500).json({
        accepted: false,
        error: "Staff sale event fetch failed.",
      });
    }
  });

  router.post("/events", async (req: Request, res: Response) => {
    const parsed = staffSaleEventSchema.safeParse(req.body);

    if (!parsed.success) {
      return validationError(res, parsed.error.issues);
    }

    try {
      const result = await store.persist(parsed.data);
      return res.status(result.duplicate ? 200 : 202).json({
        accepted: true,
        event_id: result.event_id,
        transaction_id: result.transaction_id,
        status: "persisted",
        duplicate: result.duplicate,
        received_at_server: result.received_at_server,
      });
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) {
        return res.status(503).json({
          accepted: false,
          error: error.message,
          required_env: "DATABASE_URL",
        });
      }

      if (error instanceof StaffSaleEventConflictError) {
        return res.status(409).json({
          accepted: false,
          error: error.message,
        });
      }

      console.error("[staff-sales:persist]", error);
      return res.status(500).json({
        accepted: false,
        error: "Staff sale event persistence failed.",
      });
    }
  });

  return router;
}

export default createStaffSalesRouter();
