import type { Prisma } from "@prisma/client";
import { clientScope, type CurrentUser } from "@/lib/auth";

export type CustomerFilters = { client?: string; store?: string; q?: string };

/** Filtro común para la lista y la exportación de clientes finales. */
export function customerWhere(user: CurrentUser, f: CustomerFilters): Prisma.StoreCustomerWhereInput {
  const scope = clientScope(user);
  return {
    ...scope,
    ...(f.client && !scope.clientId ? { clientId: f.client } : {}),
    ...(f.store ? { storeId: f.store } : {}),
    ...(f.q && {
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { email: { contains: f.q, mode: "insensitive" } },
        { phone: { contains: f.q } },
        { city: { contains: f.q, mode: "insensitive" } },
        { zip: { startsWith: f.q } },
      ],
    }),
  };
}
