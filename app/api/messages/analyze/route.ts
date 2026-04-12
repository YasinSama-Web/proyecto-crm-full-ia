import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { analyzeReceiptImage } from "@/lib/ai-analyzer"
import { sql } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req)
    const { imageUrl, isPdf } = await req.json() 

    const creditosACobrar = isPdf ? 2 : 1;

    // 💰 PEAJE EN CASCADA (Cobra 2 créditos exactos)
    const checkCredits = await sql`
        UPDATE usuarios 
        SET 
            ia_credits = CASE WHEN COALESCE(ia_credits, 0) >= ${creditosACobrar} THEN ia_credits - ${creditosACobrar} ELSE ia_credits END,
            ia_credits_extra = CASE WHEN COALESCE(ia_credits, 0) < ${creditosACobrar} AND COALESCE(ia_credits_extra, 0) >= ${creditosACobrar} THEN ia_credits_extra - ${creditosACobrar} ELSE ia_credits_extra END,
            mensajes_ia = COALESCE(mensajes_ia, 0) + 1 
        WHERE id = ${user.id} AND (COALESCE(ia_credits, 0) >= ${creditosACobrar} OR COALESCE(ia_credits_extra, 0) >= ${creditosACobrar})
        RETURNING ia_credits, ia_credits_extra
    `

    // ⛔ Si no pudo descontar los 2 créditos, rechaza
    if (checkCredits.length === 0) {
        return NextResponse.json({ 
            success: false, 
            error: "insufficient_credits",
            message: `Necesitas ${creditosACobrar} créditos de IA disponibles.` 
        })
    }

    const saldoPlan = checkCredits[0].ia_credits || 0;
    const saldoExtra = checkCredits[0].ia_credits_extra || 0;
    const totalRestante = saldoPlan + saldoExtra;

    // 🔥 MAGIA: SI ES PDF, EXTRAEMOS EL TEXTO
    // 🔥 MAGIA: Extracción de PDF con pdf2json
    // 🔥 MAGIA: SI ES PDF, EXTRAEMOS EL TEXTO
    let textoExtraido: string | undefined = undefined;
    if (isPdf) {
        console.log("📄 PDF Detectado en Manual. Extrayendo texto...");
        try {
            const PDFParser = require("pdf2json");
            // 🔥 FIX 1: Cambiamos 'this' por 'null'
            const pdfParser = new PDFParser(null, 1); 
            
            // 🔥 FIX 2: Le decimos explícitamente que devuelve un <string>
            textoExtraido = await new Promise<string>(async (resolve, reject) => {
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                pdfParser.on("pdfParser_dataReady", () => {
                    // Decodificamos el texto por si viene con caracteres raros de la librería
                    const rawText = pdfParser.getRawTextContent();
                    const cleanText = decodeURIComponent(rawText);
                    resolve(cleanText);
                });
                
                const res = await fetch(imageUrl);
                const buffer = await res.arrayBuffer();
                pdfParser.parseBuffer(Buffer.from(buffer));
            });
            
            // 🔥 FIX 3: VAMOS A ESPIAR QUÉ LEYÓ REALMENTE
            console.log("✅ Texto extraído:", textoExtraido.substring(0, 200));
        } catch (err) {
            console.error("❌ Error leyendo PDF:", err);
        }

        // 🛡️ VÁLVULA DE SEGURIDAD: ¿Es un falso PDF (Imagen)?
        // Borramos el texto basura que inyecta la librería para ver si realmente hay contenido
        const textoPuro = textoExtraido ? textoExtraido.replace(/----------------Page \(\d+\) Break----------------/g, '').trim() : '';

        if (!textoPuro || textoPuro.length < 15) {
            console.log("⚠️ Falso PDF detectado. Devolviendo crédito...");
            // Reembolsamos el crédito que cobramos arriba
            await sql`UPDATE usuarios SET ia_credits = ia_credits + ${creditosACobrar} WHERE id = ${user.id}`;
            
            return NextResponse.json({ 
                success: false, 
                remaining_credits: totalRestante + creditosACobrar, // Le mostramos que se lo devolvimos
                message: "El PDF es una imagen escaneada. Por favor, tómale captura y súbelo como foto (JPG/PNG)." 
            });
        }

    }
    // Llamamos al motor de IA rápido (Pasándole el texto si existe)
    const analysis = await analyzeReceiptImage(imageUrl, textoExtraido)

    // 🔥 GUARDAMOS EL REGISTRO CON DETALLES
    const logDetails = analysis.is_receipt 
        ? `Análisis manual ${isPdf ? 'PDF' : 'Imagen'} - Monto: $${analysis.amount || 0}` 
        : `Análisis manual ${isPdf ? 'PDF' : 'Imagen'} descartado`;

    await sql`
      INSERT INTO ia_usage_logs (id, usuario_id, feature, credits_cost, details)
      VALUES (
        ${crypto.randomUUID()}, 
        ${user.id}, 
        'MANUAL_VISION_RECEIPT', 
        ${creditosACobrar}, 
        ${logDetails}
      )
    `

    if (analysis.is_receipt && analysis.amount) {
        return NextResponse.json({ 
            success: true, 
            amount: analysis.amount,
            needs_manual_review: analysis.needs_manual_review,
            review_reason: analysis.fraud_flags?.join(', ') || "Revisión sugerida",
            remaining_credits: totalRestante,
            saldo_plan: saldoPlan,  
            saldo_extra: saldoExtra, 
            message: "Monto detectado" 
        })
    } else {
        return NextResponse.json({ 
            success: false, 
            remaining_credits: totalRestante,
            saldo_plan: saldoPlan,
            saldo_extra: saldoExtra,
            message: "No se detectó un comprobante válido." 
        })
    }

  } catch (error: any) {
    console.error("Error en análisis:", error)
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
  }
}