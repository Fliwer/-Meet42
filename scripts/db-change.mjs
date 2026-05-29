import { spawnSync } from "node:child_process";

const migrationName = process.argv[2];

if (!migrationName) {
  console.error("Nom manquant. Usage: npm run db:change -- nom_du_changement");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["supabase", "migration", "new", migrationName]);
run("npm", ["run", "db:sync"]);

