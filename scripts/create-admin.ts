/**
 * Crea (o convierte) el primer administrador.
 *   npm run create-admin -- tu@email.com "contraseña-segura" "Tu nombre"
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npm run create-admin -- email "contraseña" "Nombre"');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env");

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const db = new PrismaClient();

  let userId: string | undefined;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    // Ya existía: lo buscamos y actualizamos la contraseña.
    const list = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw new Error(created.error?.message ?? "No se pudo crear el usuario");
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, { password });
  }

  await db.profile.upsert({
    where: { id: userId },
    create: { id: userId, email: email.toLowerCase(), name: name ?? null, role: "ADMIN" },
    update: { role: "ADMIN", clientId: null, ...(name && { name }) },
  });
  console.log(`Administrador listo: ${email}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
