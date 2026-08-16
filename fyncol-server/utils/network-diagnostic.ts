import https from "https";
import net from "net";
import { lookup } from "dns/promises";

const TCP_TIMEOUT_MS = 7000;
const PUBLIC_IP_TIMEOUT_MS = 5000;

type TcpResult = {
  ok: boolean;
  code?: string;
  elapsedMs: number;
};

function obtenerIpPublica(): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      "https://api.ipify.org?format=json",
      {
        family: 4,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(body) as {
              ip?: string;
            };

            if (!data.ip) {
              reject(
                new Error(
                  "El servicio de IP pública no devolvió una IP."
                )
              );
              return;
            }

            resolve(data.ip);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.setTimeout(
      PUBLIC_IP_TIMEOUT_MS,
      () => {
        request.destroy(
          new Error("Timeout consultando IP pública.")
        );
      }
    );

    request.on("error", reject);
  });
}

function probarTcp(
  host: string,
  port: number
): Promise<TcpResult> {
  return new Promise((resolve) => {
    const inicio = Date.now();

    const socket = net.createConnection({
      host,
      port,
    });

    let terminado = false;

    const finalizar = (
      resultado: TcpResult
    ) => {
      if (terminado) {
        return;
      }

      terminado = true;
      socket.destroy();
      resolve(resultado);
    };

    socket.setTimeout(TCP_TIMEOUT_MS);

    socket.on("connect", () => {
      finalizar({
        ok: true,
        elapsedMs: Date.now() - inicio,
      });
    });

    socket.on("timeout", () => {
      finalizar({
        ok: false,
        code: "ETIMEDOUT",
        elapsedMs: Date.now() - inicio,
      });
    });

    socket.on("error", (error) => {
      const nodeError =
        error as NodeJS.ErrnoException;

      finalizar({
        ok: false,
        code: nodeError.code ?? "UNKNOWN",
        elapsedMs: Date.now() - inicio,
      });
    });
  });
}

export async function ejecutarDiagnosticoRed(): Promise<void> {
  console.log("");
  console.log(
    "[FYNCOL-NET-DIAG] Inicio del diagnóstico temporal de red."
  );

  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log(
      "[FYNCOL-NET-DIAG] DATABASE_URL no está configurada."
    );
    return;
  }

  let host: string;
  let port: number;

  try {
    const url = new URL(databaseUrl);

    host = url.hostname;
    port = Number(url.port || 3306);
  } catch {
    console.log(
      "[FYNCOL-NET-DIAG] No fue posible interpretar DATABASE_URL."
    );
    return;
  }

  /*
   * IMPORTANTE:
   * No imprimimos usuario, contraseña,
   * nombre de la base ni DATABASE_URL completa.
   */

  try {
    const inicioIp = Date.now();

    const ipPublica =
      await obtenerIpPublica();

    console.log(
      `[FYNCOL-NET-DIAG] Outbound IPv4: ${ipPublica} en ${
        Date.now() - inicioIp
      }ms`
    );
  } catch (error) {
    console.log(
      `[FYNCOL-NET-DIAG] Outbound IPv4 -> ERROR: ${
        error instanceof Error
          ? error.message
          : "desconocido"
      }`
    );
  }

  console.log(
    `[FYNCOL-NET-DIAG] Host configurado: ${host}`
  );

  console.log(
    `[FYNCOL-NET-DIAG] Puerto configurado: ${port}`
  );

  console.log(
    "[FYNCOL-NET-DIAG] No se registran usuario, contraseña ni DATABASE_URL completa."
  );

  try {
    const direcciones = await lookup(
      host,
      {
        all: true,
      }
    );

    console.log(
      `[FYNCOL-NET-DIAG] DNS ${host} -> ${direcciones
        .map(
          (direccion) =>
            `${direccion.address} (IPv${direccion.family})`
        )
        .join(", ")}`
    );
  } catch (error) {
    console.log(
      `[FYNCOL-NET-DIAG] DNS ${host} -> ERROR: ${
        error instanceof Error
          ? error.message
          : "desconocido"
      }`
    );
  }

  const tcp =
    await probarTcp(
      host,
      port
    );

  if (tcp.ok) {
    console.log(
      `[FYNCOL-NET-DIAG] TCP ${host}:${port} -> CONECTADO en ${tcp.elapsedMs}ms`
    );
  } else {
    console.log(
      `[FYNCOL-NET-DIAG] TCP ${host}:${port} -> ERROR (${tcp.code}) en ${tcp.elapsedMs}ms`
    );
  }

  console.log(
    "[FYNCOL-NET-DIAG] Fin del diagnóstico temporal de red."
  );

  console.log("");
}