import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

/*
  Me gusta compartidos.
  Cada "me gusta" es un archivito en el almacén "likes" con la clave  <poema>/<visitante>.
  Así nunca se hace "leer-sumar-guardar" (que se pisaría con varios usuarios):
  dar like crea la clave (solo si no existe) y quitarlo la borra. El total es cuántas claves hay.
*/

const ID_POEMA = /^[a-z0-9-]{1,60}$/;
const ID_VISITANTE = /^[a-zA-Z0-9-]{8,64}$/;
const cabeceras = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: cabeceras });
const almacen = () => getStore({ name: "likes", consistency: "strong" });

async function contarPoema(s: ReturnType<typeof almacen>, id: string): Promise<number> {
  let n = 0;
  for await (const pagina of s.list({ prefix: id + "/", paginate: true })) n += pagina.blobs.length;
  return n;
}

export default async (req: Request) => {
  const s = almacen();

  if (req.method === "GET") {
    const conteos: Record<string, number> = {};
    for await (const pagina of s.list({ paginate: true })) {
      for (const b of pagina.blobs) {
        const id = b.key.split("/")[0];
        conteos[id] = (conteos[id] || 0) + 1;
      }
    }
    return json({ conteos });
  }

  if (req.method === "POST") {
    let datos: any;
    try { datos = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
    const poema = String(datos?.poema ?? "");
    const visitante = String(datos?.visitante ?? "");
    if (!ID_POEMA.test(poema) || !ID_VISITANTE.test(visitante)) return json({ error: "Datos inválidos" }, 400);

    const clave = poema + "/" + visitante;
    if (datos.like === true) await s.set(clave, "1", { onlyIfNew: true });
    else await s.delete(clave);
    return json({ poema, total: await contarPoema(s, poema) });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: "/api/likes",
  method: ["GET", "POST"],
};
