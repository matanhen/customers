import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { relinkUserData, relinkAssignments } from '../../shared/relinkUserData.ts';

// Merges duplicate users (same email) into a single user.
// Transfers ALL data from duplicate users to the kept user before deleting duplicates.
// The kept user is the oldest one (earliest created_date); personal_code, phone,
// and custom_name are copied from duplicates if the kept user is missing them.
//
// Called by the AdminDashboard to keep the user list consistent with the advisor dashboard.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // List all users (asServiceRole to bypass RLS)
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Group by email (case-insensitive)
    const emailGroups = new Map();
    for (const u of allUsers) {
      if (!u.email) continue;
      const email = u.email.toLowerCase().trim();
      if (!emailGroups.has(email)) {
        emailGroups.set(email, []);
      }
      emailGroups.get(email).push(u);
    }

    let mergedCount = 0;
    const mergedDetails = [];

    for (const [email, users] of emailGroups) {
      if (users.length <= 1) continue;

      // Sort by created_date (oldest first) — keep the oldest as the primary
      users.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      const keepUser = users[0];
      const duplicates = users.slice(1);

      // Copy personal_code from a duplicate if keepUser doesn't have one
      if (!keepUser.personal_code) {
        for (const dup of duplicates) {
          if (dup.personal_code) {
            try {
              await base44.asServiceRole.entities.User.update(keepUser.id, { personal_code: dup.personal_code });
            } catch (e) { /* non-critical */ }
            break;
          }
        }
      }

      // Copy phone if keepUser doesn't have one
      if (!keepUser.phone || keepUser.phone === 0 || keepUser.phone === '0') {
        for (const dup of duplicates) {
          if (dup.phone && dup.phone !== 0 && dup.phone !== '0') {
            try {
              await base44.asServiceRole.entities.User.update(keepUser.id, { phone: dup.phone });
            } catch (e) { /* non-critical */ }
            break;
          }
        }
      }

      // Copy custom_name / full_name if keepUser doesn't have them
      if (!keepUser.custom_name) {
        for (const dup of duplicates) {
          if (dup.custom_name) {
            try {
              await base44.asServiceRole.entities.User.update(keepUser.id, {
                custom_name: dup.custom_name,
                full_name: dup.full_name || dup.custom_name,
              });
            } catch (e) { /* non-critical */ }
            break;
          }
        }
      }

      // Transfer data from each duplicate to the kept user, then delete the duplicate.
      // Every record is moved with a verified individual update — updateMany
      // silently fails in this runtime, which previously orphaned client data.
      // If any record fails to move, the duplicate account is KEPT.
      for (const dup of duplicates) {
        const relink = await relinkUserData(base44, dup.id, keepUser.id);
        const assignmentFailed = await relinkAssignments(base44, dup.id, keepUser.id);

        if (relink.failed > 0 || assignmentFailed > 0) {
          mergedDetails.push({
            email, kept_user_id: keepUser.id, merged_count: 0, skipped: true,
            reason: 'נכשלה העברת נתונים — המשתמש הכפול נשמר כדי שלא לאבד נתונים',
            moved: relink.moved, merged: relink.merged,
            errors: relink.errors.slice(0, 5),
          });
          continue;
        }

        // Delete the duplicate user (data has been transferred and verified)
        try {
          await base44.asServiceRole.entities.User.delete(dup.id);
          mergedCount++;
        } catch (e) { /* non-critical */ }
      }

      mergedDetails.push({ email, kept_user_id: keepUser.id, merged_count: duplicates.length });
    }

    return Response.json({
      success: true,
      merged: mergedCount,
      details: mergedDetails,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}