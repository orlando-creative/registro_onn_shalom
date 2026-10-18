// ====================================================================
// ONN — Operación Niño de la Navidad
// Supabase Edge Function: registrar-nino
// Archivo: supabase/functions/registrar-nino/index.ts
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RegistroPayload {
  nombre_completo: string;
  ci: string;
  edad: number;
  telefono_tutor: string;
  genero: "Masculino" | "Femenino";
  foto_path?: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Error de configuración en el servidor. Contacte al personal de ONN.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body: RegistroPayload = await req.json();

    // 1. Sanitización y validaciones del servidor
    const nombre = (body.nombre_completo || "").trim().replace(/\s+/g, " ");
    const ciRaw = (body.ci || "").trim().replace(/\s+/g, "");
    const ciNormalizado = ciRaw.toUpperCase();
    const edad = Number(body.edad);
    const telefono = (body.telefono_tutor || "").trim().replace(/\s+/g, " ");
    const genero = body.genero;
    const fotoPath = body.foto_path || null;

    if (!nombre || nombre.length < 2 || nombre.length > 160) {
      return new Response(
        JSON.stringify({ error: "El nombre completo debe tener entre 2 y 160 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ciNormalizado || ciNormalizado.length < 3 || ciNormalizado.length > 30) {
      return new Response(
        JSON.stringify({ error: "El documento de identidad (CI) no es válido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isNaN(edad) || edad < 1 || edad > 18 || !Number.isInteger(edad)) {
      return new Response(
        JSON.stringify({ error: "La edad debe ser un número entero entre 1 y 18 años." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!telefono || telefono.length < 6 || telefono.length > 30) {
      return new Response(
        JSON.stringify({ error: "El número telefónico del tutor debe tener entre 6 y 30 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (genero !== "Masculino" && genero !== "Femenino") {
      return new Response(
        JSON.stringify({ error: "El género seleccionado debe ser 'Masculino' o 'Femenino'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Comprobación segura de CI duplicado (sin exponer identidades)
    const { data: existente, error: queryError } = await supabaseAdmin
      .from("ninos")
      .select("id")
      .eq("ci", ciNormalizado)
      .maybeSingle();

    if (queryError) {
      console.error("Error al consultar CI en base de datos:", queryError);
      return new Response(
        JSON.stringify({ error: "Error de conexión al verificar el documento. Intente nuevamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existente) {
      // Si ya existe foto subida, limpiar para evitar archivos huérfanos
      if (fotoPath) {
        await supabaseAdmin.storage.from("onn-fotos").remove([fotoPath]);
      }
      return new Response(
        JSON.stringify({
          error: "Ya existe un registro con este documento de identidad. Si cree que es un error, por favor comuníquese con el personal autorizado de ONN.",
          codigo: "CI_DUPLICADO",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Inserción del registro en PostgreSQL
    const { data: nuevoNino, error: insertError } = await supabaseAdmin
      .from("ninos")
      .insert({
        nombre_completo: nombre,
        ci: ciNormalizado,
        edad: edad,
        telefono_tutor: telefono,
        genero: genero,
        foto_path: fotoPath,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Error al insertar registro en PostgreSQL:", insertError);
      // Limpieza de foto si la BD falló
      if (fotoPath) {
        await supabaseAdmin.storage.from("onn-fotos").remove([fotoPath]);
      }
      return new Response(
        JSON.stringify({ error: "No se pudo completar el registro en el sistema. Intente más tarde." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Respuesta segura de confirmación sin exponer datos de otros niños
    return new Response(
      JSON.stringify({
        exito: true,
        mensaje: "El niño ha sido registrado exitosamente en el sistema de la Operación Niño de la Navidad.",
        registroId: nuevoNino.id,
        fecha: nuevoNino.created_at,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error inesperado";
    console.error("Error en Edge Function registrar-nino:", errorMsg);
    return new Response(
      JSON.stringify({ error: "Ocurrió un error inesperado al procesar la solicitud." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
