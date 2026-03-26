import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configura tu Access Token de Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

const PACKS_DATA = {
    pack_s: { name: "Pack S - 500 Créditos IA", amount: 500, price: 15000 },
    pack_m: { name: "Pack M - 2000 Créditos IA", amount: 2000, price: 50000 },
    pack_l: { name: "Pack L - 5000 Créditos IA", amount: 5000, price: 100000 },
};

export async function POST(req: Request) {
    try {
        const user = await requireAuth(req);
        const { packId } = await req.json();

        const selectedPack = PACKS_DATA[packId as keyof typeof PACKS_DATA];
        
        if (!selectedPack) {
            return NextResponse.json({ error: "Paquete inválido" }, { status: 400 });
        }

        const preference = new Preference(client);

        const response = await preference.create({
            body: {
                items: [
                    {
                        id: packId,
                        title: selectedPack.name,
                        quantity: 1,
                        unit_price: selectedPack.price,
                        currency_id: "ARS",
                    }
                ],
                // 🔥 ESTA ES LA LLAVE MÁGICA PARA EL WEBHOOK
                external_reference: `CREDITS_${user.rootOwnerId}_${selectedPack.amount}`,
                
                metadata: {
                    user_id: user.rootOwnerId,
                    type: "ia_credits_recharge",
                    credits_amount: selectedPack.amount
                },
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=success`,
                    failure: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=failed`,
                },
                auto_return: "approved",
            }
        });

        // Devolvemos el link de pago al Frontend
        return NextResponse.json({ url: response.init_point });

    } catch (error) {
        console.error("Error creando preferencia MP:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
