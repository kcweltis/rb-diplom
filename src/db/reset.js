const { pool } = require("../config/db");

async function reset() {
  // Drop all tables (careful). For dev only.
  await pool.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public')
      LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  console.log("Dropped all public tables.");
  await pool.end();
}

reset().catch((e) => {
  console.error(e);
  process.exit(1);
});
