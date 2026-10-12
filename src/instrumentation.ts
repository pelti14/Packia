/** Next.js lo ejecuta una vez al arrancar el servidor. */
export async function register() {
  // La importación va dentro del if para que no se incluya en el runtime "edge".
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AUTO_SYNC !== "off") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
