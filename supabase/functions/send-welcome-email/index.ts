import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  businessName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, businessName }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "AfriCaisse <onboarding@resend.dev>",
      to: [email],
      subject: "Bienvenue sur AfriCaisse ! 🇧🇯",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #1f2937;
              margin-top: 0;
              font-size: 24px;
            }
            .content p {
              color: #4b5563;
              line-height: 1.6;
              margin: 16px 0;
            }
            .features {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
            }
            .feature {
              display: flex;
              align-items: start;
              margin: 12px 0;
            }
            .feature-icon {
              color: #4f46e5;
              font-size: 20px;
              margin-right: 12px;
            }
            .feature-text {
              color: #374151;
              flex: 1;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: white;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 8px;
              font-weight: 600;
              margin: 24px 0;
            }
            .footer {
              background-color: #f9fafb;
              padding: 24px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .trial-badge {
              background-color: #dcfce7;
              color: #166534;
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
              font-weight: 600;
              margin: 16px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🇧🇯 AfriCaisse POS</h1>
            </div>
            <div class="content">
              <h2>Bienvenue ${fullName} ! 👋</h2>
              <p>Nous sommes ravis de vous accueillir sur <strong>AfriCaisse</strong>, votre solution de caisse moderne adaptée aux commerces du Bénin.</p>
              
              <div class="trial-badge">
                ✨ 30 jours d'essai gratuit activés
              </div>
              
              <p>Votre commerce <strong>${businessName}</strong> est maintenant prêt à bénéficier de toutes les fonctionnalités d'AfriCaisse :</p>
              
              <div class="features">
                <div class="feature">
                  <span class="feature-icon">🛒</span>
                  <span class="feature-text">Point de vente rapide et intuitif</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">📦</span>
                  <span class="feature-text">Gestion complète de votre stock</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">👥</span>
                  <span class="feature-text">Suivi de vos clients et fournisseurs</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">📊</span>
                  <span class="feature-text">Analyses détaillées de vos ventes</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">💰</span>
                  <span class="feature-text">Gestion du crédit client</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">🧾</span>
                  <span class="feature-text">Génération de factures et reçus</span>
                </div>
              </div>
              
              <p>Votre email a été confirmé avec succès. Vous pouvez maintenant vous connecter et commencer à utiliser AfriCaisse.</p>
              
              <center>
                <a href="${Deno.env.get("VITE_SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "#"}/auth" class="cta-button">
                  Se connecter maintenant →
                </a>
              </center>
              
              <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                Besoin d'aide pour démarrer ?<br>
                Notre équipe est disponible pour vous accompagner.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} AfriCaisse - Solution POS pour le Bénin 🇧🇯</p>
              <p style="margin-top: 8px; font-size: 12px;">
                Cet email a été envoyé suite à votre inscription sur AfriCaisse.<br>
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
