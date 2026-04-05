// src/api/license.ts — License activation HTTP API
import { verifyLicenseKey } from "../core/license";
import { PRO_PUBLIC_KEY } from "../pro/keys";
import { saveLicense, loadLicense, clearLicense } from "../core/license-store";

/**
 * POST /api/license/activate
 * Request body: { key: "BR-..." }
 * Response: { success: true, payload } | { success: false, error: string }
 */
export async function handleLicenseActivate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { key?: string };

    if (!body.key || typeof body.key !== "string") {
      return Response.json(
        { success: false, error: "Invalid request: missing 'key'" },
        { status: 400 }
      );
    }

    const payload = verifyLicenseKey(body.key, PRO_PUBLIC_KEY);

    if (!payload) {
      return Response.json(
        { success: false, error: "Invalid license key" },
        { status: 400 }
      );
    }

    // Save license
    saveLicense({
      key: body.key,
      activatedAt: new Date().toISOString(),
      payload,
    });

    return Response.json({
      success: true,
      payload,
    });
  } catch (error) {
    console.error("License activation error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/license/status
 * Response: { activated: boolean, payload?: LicensePayload }
 */
export async function handleLicenseStatus(req: Request): Promise<Response> {
  try {
    const license = loadLicense();

    if (!license) {
      return Response.json({
        activated: false,
      });
    }

    return Response.json({
      activated: true,
      payload: license.payload,
      key: license.key,
      activatedAt: license.activatedAt,
    });
  } catch (error) {
    console.error("License status error:", error);
    return Response.json(
      { activated: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/license
 * Response: { success: boolean }
 */
export async function handleLicenseDelete(req: Request): Promise<Response> {
  try {
    clearLicense();
    return Response.json({ success: true });
  } catch (error) {
    console.error("License deletion error:", error);
    return Response.json(
      { success: false, error: "Failed to clear license" },
      { status: 500 }
    );
  }
}
