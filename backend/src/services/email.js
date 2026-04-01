import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Enviar email de notificación de informe listo
export const sendReportNotificationEmail = async (
  patientEmail,
  patientName,
  studyId,
) => {
  try {
    const safeName = patientName.replace(/</g, "&lt;");

    const { data, error } = await resend.emails.send({
      from: "Diagnóstico López <onboarding@resend.dev>", // 🔥 IMPORTANTE
      to: [patientEmail],
      subject:
        "Su informe médico está disponible - Diagnóstico por Imágenes López",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Informe Médico Disponible</title>
        </head>
        <body style="font-family: Arial; background:#f4f4f4; padding:20px;">
          <div style="background:#fff; padding:20px; border-radius:10px;">
            <h2>🏥 Diagnóstico por Imágenes López</h2>
            <p>Estimado/a <strong>${safeName}</strong>,</p>

            <p>Su informe médico ya está disponible.</p>
            <p>Recuerde que su DNI es el que usará para acceder a su informe.</p>

            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login?redirect=study/${studyId}"
               style="background:#3498db;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">
              Ver Informe
            </a>

            <p style="margin-top:20px; font-size:12px;">
              Este es un mensaje automático, no responder.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw new Error(`Error al enviar email: ${error.message}`);
    }

    console.log("Email enviado:", {
      to: patientEmail,
      id: data?.id,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error en sendReportNotificationEmail:", error);
    throw error;
  }
};

// Email de bienvenida
export const sendWelcomeEmail = async (patientEmail, patientName) => {
  try {
    const safeName = patientName.replace(/</g, "&lt;");

    const { data, error } = await resend.emails.send({
      from: "Diagnóstico López <onboarding@resend.dev>", // 🔥 IMPORTANTE
      to: [patientEmail],
      subject: "Bienvenido a Diagnóstico por Imágenes López",
      html: `
        <div style="font-family: Arial;">
          <h2>Bienvenido/a ${safeName}</h2>
          <p>Su cuenta ha sido creada exitosamente.</p>

          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login"
             style="background:#3498db;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">
            Iniciar Sesión
          </a>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      throw new Error(`Error al enviar email de bienvenida: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error en sendWelcomeEmail:", error);
    throw error;
  }
};
