/**
 * Dérive les variables d'environnement PG* (PGHOST/PGPORT/PGUSER/PGPASSWORD/
 * PGDATABASE) depuis une URL de connexion — évite de passer la chaîne de
 * connexion (mot de passe inclus) en argument de ligne de commande à
 * `pg_dump`/`pg_restore`, visible dans `ps aux` pendant l'exécution.
 */
export function pgEnvFromUrl(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.replace(/^\//, ""),
  };
}
