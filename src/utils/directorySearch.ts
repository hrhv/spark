import type { DirectoryPerson } from "@/types";

// Re-export so existing callers that imported from here keep working.
export type { DirectoryPerson };

/**
 * Searches the authenticated user's Google Workspace domain directory.
 * Only works for Workspace accounts (hd claim present) with the
 * directory.readonly scope granted.
 */
export async function searchDirectoryPeople(
  query: string,
  accessToken: string
): Promise<DirectoryPerson[]> {
  if (query.length < 2) return [];

  const params = new URLSearchParams();
  params.append("query", query);
  params.append("sources", "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE");
  params.append("sources", "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT");
  params.append("readMask", "names,emailAddresses,photos");
  params.append("pageSize", "8");

  const res = await fetch(
    `https://people.googleapis.com/v1/people:searchDirectoryPeople?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return ((data.people ?? []) as Record<string, unknown>[])
    .map(p => {
      const names  = p.names  as { displayName?: string }[]  | undefined;
      const emails = p.emailAddresses as { value?: string }[] | undefined;
      const photos = p.photos as { url?: string }[]           | undefined;
      return {
        name:  names?.[0]?.displayName ?? "",
        email: emails?.[0]?.value ?? "",
        photo: photos?.[0]?.url,
      };
    })
    .filter(p => Boolean(p.email));
}
