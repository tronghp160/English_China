import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let adminUser: string;

const rowsFor = (who: string | null | "service") =>
  as(db, who, async () => (await db.query<{ user_id: string }>("select user_id from public.clone_access order by user_id")).rows.map((r) => r.user_id));

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  adminUser = await createUser(db, "admin@example.com", "Admin");
  // only the service role writes (the server action does it after checking the caller is an admin)
  await as(db, "service", () =>
    db.query("insert into public.clone_access (user_id, granted_by) values ($1, $2)", [alice, adminUser]),
  );
}, 60_000);

describe("clone_access: nobody has access by default", () => {
  it("a new account has no row", async () => {
    expect(await rowsFor(bob)).toEqual([]);
  });
});

describe("clone_access: reading", () => {
  it("a person sees their own row", async () => {
    expect(await rowsFor(alice)).toEqual([alice]);
  });

  it("a person cannot see anybody else's row, so cannot learn who else has access", async () => {
    expect(await rowsFor(bob)).toEqual([]);
    // asking for alice's row by id returns nothing for bob
    const res = await as(db, bob, () => db.query("select * from public.clone_access where user_id = $1", [alice]));
    expect(res.rows).toEqual([]);
  });

  it("the service role sees every row", async () => {
    expect(await rowsFor("service")).toEqual([alice]);
  });

  it("anon cannot read the table at all", async () => {
    await expect(rowsFor(null)).rejects.toThrow(/permission denied/i);
  });
});

describe("clone_access: a user cannot give themselves (or anybody) access", () => {
  it("insert as an ordinary user is refused, for their own id and for another's", async () => {
    for (const target of [bob, alice]) {
      await expect(
        as(db, bob, () => db.query("insert into public.clone_access (user_id) values ($1)", [target])),
      ).rejects.toThrow(/permission denied/i);
    }
    expect(await rowsFor("service")).toEqual([alice]);
  });

  it("insert as anon is refused", async () => {
    await expect(
      as(db, null, () => db.query("insert into public.clone_access (user_id) values ($1)", [bob])),
    ).rejects.toThrow(/permission denied/i);
  });

  it("update and delete as an ordinary user are refused (a granted account cannot keep or change its own row)", async () => {
    await expect(
      as(db, alice, () => db.query("update public.clone_access set granted_by = $1 where user_id = $2", [alice, alice])),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      as(db, alice, () => db.query("delete from public.clone_access where user_id = $1", [alice])),
    ).rejects.toThrow(/permission denied/i);
    expect(await rowsFor("service")).toEqual([alice]);
  });
});

describe("clone_access: the service role manages it", () => {
  it("can switch an account on and off, and a second grant does not duplicate", async () => {
    await as(db, "service", () => db.query("insert into public.clone_access (user_id, granted_by) values ($1, $2)", [bob, adminUser]));
    expect(await rowsFor(bob)).toEqual([bob]);
    await as(db, "service", () =>
      db.query("insert into public.clone_access (user_id, granted_by) values ($1, $2) on conflict (user_id) do nothing", [bob, adminUser]),
    );
    expect(await rowsFor("service")).toEqual([alice, bob].sort());
    await as(db, "service", () => db.query("delete from public.clone_access where user_id = $1", [bob]));
    expect(await rowsFor(bob)).toEqual([]);
  });

  it("deleting the account removes its row", async () => {
    const carol = await createUser(db, "carol@example.com", "Carol");
    await as(db, "service", () => db.query("insert into public.clone_access (user_id) values ($1)", [carol]));
    await db.query("delete from auth.users where id = $1", [carol]);
    expect(await rowsFor("service")).toEqual([alice]);
  });

  it("keeps the row when the admin who granted it is deleted (granted_by is set to null)", async () => {
    const temp = await createUser(db, "temp-admin@example.com", "Temp");
    const dave = await createUser(db, "dave@example.com", "Dave");
    await as(db, "service", () => db.query("insert into public.clone_access (user_id, granted_by) values ($1, $2)", [dave, temp]));
    await db.query("delete from auth.users where id = $1", [temp]);
    const res = await as(db, "service", () => db.query<{ granted_by: string | null }>("select granted_by from public.clone_access where user_id = $1", [dave]));
    expect(res.rows[0].granted_by).toBeNull();
  });
});
