import { refreshSession } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { workos } from "../workos";

//custom backend switch has to accept some organizationId
export const switchToOrganizationAction = async ({
  organizationId,
  pathname,
}: {
  organizationId: string;
  pathname: string;
}) => {
  "use server";

  try {
    await refreshSession({ organizationId, ensureSignedIn: true });
  } catch (err: any) {
    if (err.rawData.authkit_redirect_url) {
      redirect(err.rawData.authkit_redirect_url);
    } else {
      const args = {
        organizationId,
        clientId: process.env.WORKOS_CLIENT_ID!,
        provider: "authkit",
        redirectUri: "http://localhost:4040/callback",
      };

      if (err.error === "sso_required" || err.error === "mfa_enrollment") {
        const url = workos.userManagement.getAuthorizationUrl({
          ...args,
        });
        redirect(url);
      }
      throw err;
    }
  }

  /**
   * Ensures the widget auth token is refreshed based on the updated
   * organization id.
   */
  revalidatePath(pathname);
  redirect(pathname);
};
