import { createClient } from "@supabase/supabase-js";

// Supabase public credentials (anon key is safe to expose — RLS protects data)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://pysyefetnnqecbxiicog.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_JV7mQHb2tEY1eVjQ9tcxvQ_O3g8CN1_";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Generic file upload to Supabase Storage
 */
export async function uploadFile(bucket, filePath, blob) {
  if (!supabase) return null;
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, { upsert: true, contentType: blob.type });

    if (error) {
      console.error(`Upload error [${bucket}]:`, error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error(`Upload failed [${bucket}]:`, err);
    return null;
  }
}

/**
 * Upload a screenshot image to Supabase Storage.
 * Returns the public URL on success, or null on failure.
 */
export async function uploadScreenshot(tradeId, slotKey, base64DataUrl) {
  try {
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1] || "png";
    const filePath = `trades/${tradeId}/${slotKey}.${ext}`;
    return await uploadFile("screenshots", filePath, blob);
  } catch (err) {
    console.error("Screenshot process failed:", err);
    return null;
  }
}

/**
 * CRUD helpers for trades table
 */
export const tradesApi = {
  async getAll(account) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("account", account)
      .order("date", { ascending: false });
    if (error) {
      console.error("Fetch trades error:", error);
      return null;
    }
    return data;
  },

  async upsert(trade) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("trades")
      .upsert(trade, { onConflict: "id" })
      .select()
      .single();
    if (error) {
      console.error("Upsert trade error:", error);
      return null;
    }
    return data;
  },

  async remove(id) {
    if (!supabase) return false;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) {
      console.error("Delete trade error:", error);
      return false;
    }
    return true;
  },

  async bulkInsert(trades) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("trades")
      .insert(trades)
      .select();
    if (error) {
      console.error("Bulk insert error:", error);
      return null;
    }
    return data;
  },
};

/**
 * Psychology journal entries
 */
export const psychologyApi = {
  async getAll() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("psychology_entries")
      .select("*")
      .order("date", { ascending: false });
    if (error) {
      console.error("Fetch psychology error:", error);
      return null;
    }
    return data;
  },

  async upsert(entry) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("psychology_entries")
      .upsert(entry, { onConflict: "id" })
      .select()
      .single();
    if (error) {
      console.error("Upsert psychology error:", error);
      return null;
    }
    return data;
  },

  async remove(id) {
    if (!supabase) return false;
    const { error } = await supabase
      .from("psychology_entries")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Delete psychology error:", error);
      return false;
    }
    return true;
  },
};

/**
 * Papers / Estudos — pesquisas macro, leituras de mercado, anotações conceituais
 */
export const papersApi = {
  async getAll() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("papers")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("date", { ascending: false });
    if (error) {
      console.error("Fetch papers error:", error);
      return null;
    }
    return data;
  },

  async upsert(paper) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("papers")
      .upsert(paper, { onConflict: "id" })
      .select()
      .single();
    if (error) {
      console.error("Upsert paper error:", error);
      return null;
    }
    return data;
  },

  async remove(id) {
    if (!supabase) return false;
    const { error } = await supabase.from("papers").delete().eq("id", id);
    if (error) {
      console.error("Delete paper error:", error);
      return false;
    }
    return true;
  },
};

/**
 * Accounts table — persists account names to the cloud
 */
export const accountsApi = {
  async getAll() {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("Fetch accounts error:", error);
      return null;
    }
    return data;
  },

  async upsert(account) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("accounts")
      .upsert(account, { onConflict: "name" })
      .select()
      .single();
    if (error) {
      console.error("Upsert account error:", error);
      return null;
    }
    return data;
  },

  async remove(name) {
    if (!supabase) return false;
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("name", name);
    if (error) {
      console.error("Delete account error:", error);
      return false;
    }
    return true;
  },
};
