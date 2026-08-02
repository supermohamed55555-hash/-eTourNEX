/**
 * Shared audit-log writer for server actions.
 *
 * Deliberately NOT a `'use server'` module. Marking it so would turn every
 * export into a client-callable server-action endpoint, handing the browser a
 * way to write arbitrary rows into `audit_logs`. This is a plain server-side
 * module, imported by the `'use server'` files that need it.
 */

export async function logAudit(
  supabase: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any>
) {
  // Audit logging stays non-fatal — a failed log must not roll back the
  // operation it describes. It must not be silent either: supabase-js returns
  // errors instead of throwing, so a bare try/catch never saw a failed insert.
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });

    if (error) {
      console.error(
        `Audit log failed for "${action}" on ${entityType} ${entityId}: ` +
          `${error.code || '?'} ${error.message}`
      );
    }
  } catch (err) {
    // Only a genuine throw reaches here (e.g. a misconfigured client).
    console.error(`Audit log threw for "${action}" on ${entityType} ${entityId}:`, err);
  }
}
