import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let adminUser: string;
let normalUser: string;

beforeAll(async () => {
  db = await createDb();
  adminUser = await createUser(db, "admin@example.com", "Admin User");
  normalUser = await createUser(db, "normal@example.com", "Normal User");
}, 60_000);

describe("admin_audit_log and admin_user_notes", () => {
  describe("RLS restrictions", () => {
    it("blocks anon from reading or writing admin_audit_log and admin_user_notes", async () => {
      // anon read should throw permission denied
      await expect(
        as(db, "anon", () => db.query("select * from public.admin_audit_log")),
      ).rejects.toThrow(/permission denied/i);

      await expect(
        as(db, "anon", () => db.query("select * from public.admin_user_notes")),
      ).rejects.toThrow(/permission denied/i);

      // anon insert should throw permission denied
      await expect(
        as(db, "anon", () =>
          db.query(
            "insert into public.admin_audit_log (action) values ('test')",
          ),
        ),
      ).rejects.toThrow(/permission denied/i);

      await expect(
        as(db, "anon", () =>
          db.query(
            "insert into public.admin_user_notes (user_id, note) values ($1, 'test')",
            [normalUser],
          ),
        ),
      ).rejects.toThrow(/permission denied/i);
    });

    it("blocks authenticated user from reading or writing admin_audit_log and admin_user_notes", async () => {
      await expect(
        as(db, normalUser, () => db.query("select * from public.admin_audit_log")),
      ).rejects.toThrow(/permission denied/i);

      await expect(
        as(db, normalUser, () => db.query("select * from public.admin_user_notes")),
      ).rejects.toThrow(/permission denied/i);

      await expect(
        as(db, normalUser, () =>
          db.query(
            "insert into public.admin_audit_log (action) values ('test')",
          ),
        ),
      ).rejects.toThrow(/permission denied/i);

      await expect(
        as(db, normalUser, () =>
          db.query(
            "insert into public.admin_user_notes (user_id, note) values ($1, 'test')",
            [normalUser],
          ),
        ),
      ).rejects.toThrow(/permission denied/i);
    });

    it("allows service role to read and write admin_audit_log and admin_user_notes", async () => {
      await as(db, "service", () =>
        db.query(
          `insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id, target_label)
           values ($1, 'admin@example.com', 'grant_admin', $2, 'Normal User')`,
          [adminUser, normalUser],
        ),
      );

      const auditRows = await as(db, "service", () =>
        db.query<{ action: string; target_label: string }>(
          "select action, target_label from public.admin_audit_log where target_user_id = $1",
          [normalUser],
        ),
      );
      expect(auditRows.rows).toHaveLength(1);
      expect(auditRows.rows[0].action).toBe("grant_admin");
      expect(auditRows.rows[0].target_label).toBe("Normal User");

      await as(db, "service", () =>
        db.query(
          `insert into public.admin_user_notes (user_id, note, updated_by)
           values ($1, 'Special attention needed', $2)`,
          [normalUser, adminUser],
        ),
      );

      const noteRows = await as(db, "service", () =>
        db.query<{ note: string }>(
          "select note from public.admin_user_notes where user_id = $1",
          [normalUser],
        ),
      );
      expect(noteRows.rows).toHaveLength(1);
      expect(noteRows.rows[0].note).toBe("Special attention needed");
    });
  });

  describe("cascade and foreign keys", () => {
    it("sets admin_id to null when admin user is deleted, keeping audit log", async () => {
      const tempAdmin = await createUser(db, "tempadmin@example.com", "Temp Admin");

      await as(db, "service", () =>
        db.query(
          `insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id)
           values ($1, 'tempadmin@example.com', 'ban', $2)`,
          [tempAdmin, normalUser],
        ),
      );

      // Delete tempAdmin
      await db.query("delete from auth.users where id = $1", [tempAdmin]);

      const log = await as(db, "service", () =>
        db.query<{ admin_id: string | null; admin_email: string }>(
          "select admin_id, admin_email from public.admin_audit_log where admin_email = 'tempadmin@example.com'",
        ),
      );
      expect(log.rows).toHaveLength(1);
      expect(log.rows[0].admin_id).toBeNull();
      expect(log.rows[0].admin_email).toBe("tempadmin@example.com");
    });

    it("cascades deletion of user to admin_user_notes, but preserves audit log", async () => {
      const tempUser = await createUser(db, "tempuser@example.com", "Temp User");

      await as(db, "service", () =>
        db.query(
          `insert into public.admin_user_notes (user_id, note)
           values ($1, 'Note on temp user')`,
          [tempUser],
        ),
      );

      await as(db, "service", () =>
        db.query(
          `insert into public.admin_audit_log (admin_id, action, target_user_id, target_label)
           values ($1, 'save_note', $2, 'Temp User')`,
          [adminUser, tempUser],
        ),
      );

      // Delete tempUser
      await db.query("delete from auth.users where id = $1", [tempUser]);

      const notes = await as(db, "service", () =>
        db.query("select * from public.admin_user_notes where user_id = $1", [tempUser]),
      );
      expect(notes.rows).toHaveLength(0);

      const logs = await as(db, "service", () =>
        db.query<{ target_user_id: string; target_label: string }>(
          "select target_user_id, target_label from public.admin_audit_log where target_label = 'Temp User'",
        ),
      );
      expect(logs.rows).toHaveLength(1);
      expect(logs.rows[0].target_user_id).toBe(tempUser);
    });
  });
});
