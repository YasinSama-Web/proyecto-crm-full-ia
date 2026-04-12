import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ReceiptAnalysis {
  is_receipt: boolean;
  amount: number | null;
  currency: string | null;
  date: string | null;
  confidence: "high" | "medium" | "low";
  fraud_score?: number; 
  fraud_flags?: string[];
  needs_manual_review?: boolean;
  bank_detected?: string;
  review_reason?: string;
}

// 🔥 AHORA ACEPTA pdfText
export async function analyzeReceiptImage(imageUrl: string, pdfText?: string): Promise<ReceiptAnalysis> {
  const startTime = Date.now();
  
  try {
    console.log(`🤖 IA: Iniciando Pase 1... Modo: ${pdfText ? 'PDF TEXTO' : 'IMAGEN'}`);

    // ============================================================================
    // FASE 1: EL GUARDIA DE SEGURIDAD (gpt-4o-mini)
    // ============================================================================
    
    // Si hay texto de PDF se lo pasamos escrito. Si no, le pasamos la URL de la imagen.
    const messagePayload = pdfText 
        ? { type: "text", text: `Extrae los datos de este texto proveniente de un comprobante PDF bancario:\n\n${pdfText}` }
        : { type: "image_url", image_url: { url: imageUrl, detail: "low" } };

    const response1 = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        {
          role: "system",
          content: `Extrae los datos del comprobante bancario. 
          INCLUSO si notas que es falso, marca "is_receipt": true. 
          
          Reglas de Extracción:
          - amount: NÚMERO ABSOLUTO sin puntos ni comas. Si tiene signo negativo, ignóralo (ej: -10000 -> 10000).
          - bank_detected: Identifica el banco (ej: mercadopago, brubank, uala, naranja, santander, galicia, macro).
          - looks_suspicious: Marca 'true' si ves algo MÍNIMAMENTE raro (desalineación, tipografía, fecha inconsistente).
          
          Devuelve SOLO JSON estricto: {
            "is_receipt": boolean,
            "amount": number,
            "currency": "ARS",
            "date": "DD/MM/AAAA",
            "bank_detected": string,
            "confidence": "high" o "low",
            "looks_suspicious": boolean
          }`
        },
        {
          role: "user",
          content: [messagePayload as any],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.0,
    });

    const result1 = JSON.parse(response1.choices[0].message.content || "{}");

    let parsedAmount = result1.amount;
    if (typeof parsedAmount === 'string') {
        parsedAmount = parsedAmount.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    }
    result1.amount = parsedAmount ? Math.abs(Number(parsedAmount)) : null;

    if (!result1.is_receipt || !result1.amount) {
       console.log("❌ IA: Rechazado en Fase 1");
       return { ...result1, needs_manual_review: false } as ReceiptAnalysis;
    }

    const bankDetected = result1.bank_detected?.toLowerCase() || "desconocido";

    // 🔥 FIX GIGANTE: SI ES PDF, NOS SALTAMOS LA FASE VISUAL 2 (No hay pixeles que revisar)
    if (pdfText) {
        console.log(`✅ APROBADO PDF RÁPIDO. Monto: $${result1.amount}`);
        return {
            is_receipt: true, amount: result1.amount, currency: result1.currency, date: result1.date,
            confidence: "high", fraud_score: 0.0, fraud_flags: [], needs_manual_review: false, bank_detected: bankDetected,
        };
    }

    const isSuspiciousVisual = result1.looks_suspicious === true;
    const isLowConfidence = result1.confidence === "low";
    const isHighRiskAmount = result1.amount >= 100000; 

    // ============================================================================
    // FASE 2: EL DOCTOR ANTIFRAUDE FORENSE (Solo para Imágenes)
    // ============================================================================
    if (isSuspiciousVisual || isLowConfidence || isHighRiskAmount) {
       console.log(`⚠️ IA: Fase 2 activada. Sospechoso: ${isSuspiciousVisual} | Monto Alto: ${isHighRiskAmount}`);

       const response2 = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `ALERTA MÁXIMA DE FRAUDE: Este comprobante de $${result1.amount} ha sido marcado como "Altamente Sospechoso" de manipulación digital (Photoshop). 
              Eres un PERITO FORENSE PARANOICO Y ESTRICTO. Tu misión es ENCONTRAR la alteración visual en la cifra del monto.
              
              INSPECCIÓN MICROSCÓPICA OBLIGATORIA DEL MONTO:
              1. Analiza el primer dígito del monto: ¿Está milimétricamente alineado (horizontal y verticalmente) con el resto de los ceros?
              2. Kerning: ¿El espacio entre el primer dígito y el punto/coma es idéntico al espacio entre los demás ceros?
              3. Grosor: ¿El primer dígito se ve ligerísimamente más grueso, más oscuro o más borroso que los ceros que le siguen?
              4. Colores: ¿Notas recuadros blancos o negros o del color del comprobante "pegados" debajo de los numeros? 
              
              Si notas la más mínima desviación, asimetría, o número "flotando", tu 'fraud_score' DEBE ser 0.8 o 0.9. No justifiques las imperfecciones. 
              Si es una captura de pantalla 100% original e inmaculada de un banco, pon 0.1.
              
              Devuelve SOLO JSON estricto: {
                "forensic_analysis": "Análisis...",
                "fraud_score": number,
                "fraud_flags": string[]
              }`
            },
            {
              role: "user",
              content: [{ type: "image_url", image_url: { url: imageUrl, detail: "high" } }],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 350,
          temperature: 0.1, 
        });

        const result2 = JSON.parse(response2.choices[0].message.content || "{}");
        const fraudScore = result2.fraud_score || 0;
        const strictThreshold = result1.amount >= 100000 ? 0.3 : 0.5;

        return {
            is_receipt: true, amount: result1.amount, currency: result1.currency, date: result1.date,
            confidence: fraudScore > 0.6 ? "low" : "high", fraud_score: fraudScore, fraud_flags: result2.fraud_flags || [],
            bank_detected: bankDetected, needs_manual_review: fraudScore > strictThreshold || isSuspiciousVisual
        };
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ APROBADO RÁPIDO. Monto: $${result1.amount} | Tiempo: ${processingTime}ms`);

    return {
        is_receipt: true, amount: result1.amount, currency: result1.currency, date: result1.date,
        confidence: "high", fraud_score: 0.0, fraud_flags: [], needs_manual_review: false, bank_detected: bankDetected,
    };

  } catch (error) {
    console.error("❌ Error en análisis IA:", error);
    return { is_receipt: false, amount: null, currency: null, date: null, confidence: "low" };
  }
}

