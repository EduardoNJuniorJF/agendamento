import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is a dev user
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: hasDevRole } = await createClient(supabaseUrl, serviceRoleKey)
          .rpc("has_role", { _user_id: user.id, _role: "dev" });
        if (!hasDevRole) {
          return new Response(JSON.stringify({ error: "Acesso negado" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Tables to backup
    const tables = [
      "profiles",
      "agents",
      "vehicles",
      "appointments",
      "appointment_agents",
      "vacations",
      "time_off",
      "time_bank",
      "time_bank_transactions",
      "user_bonus_balances",
      "bonus_settings",
      "city_bonus_levels",
      "birthdays",
      "seasonal_dates",
      "local_holidays",
      "user_roles",
      "implantation_clients",
      "implantation_projects",
      "audit_log",
    ];

    const backupData: Record<string, unknown[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`Error backing up ${table}:`, error.message);
        backupData[table] = [];
      } else {
        backupData[table] = data || [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.json`;
    const jsonContent = JSON.stringify(backupData, null, 2);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(fileName, new Blob([jsonContent], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Clean old backups (older than 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: files } = await supabase.storage.from("backups").list();

    if (files) {
      const oldFiles = files.filter((f) => {
        // Extract date from filename: backup-YYYY-MM-DDTHH-MM-SS-SSSZ.json
        const match = f.name.match(/backup-(\d{4}-\d{2}-\d{2})/);
        if (match) {
          return new Date(match[1]) < threeMonthsAgo;
        }
        return false;
      });

      if (oldFiles.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("backups")
          .remove(oldFiles.map((f) => f.name));
        if (deleteError) {
          console.error("Error cleaning old backups:", deleteError.message);
        }
      }
    }

    const tableStats = Object.entries(backupData).map(([t, rows]) => ({
      table: t,
      rows: rows.length,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        tables: tableStats,
        sizeKB: Math.round(jsonContent.length / 1024),
        oldFilesRemoved: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
