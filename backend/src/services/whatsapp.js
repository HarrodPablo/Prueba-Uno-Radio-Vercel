const twilio = require("twilio");

// Solo inicializar si las credenciales están configuradas correctamente
const isConfigured =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER &&
  process.env.TWILIO_ACCOUNT_SID.startsWith("AC");

let client = null;
if (isConfigured) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
}
process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER &&
  process.env.TWILIO_ACCOUNT_SID.startsWith("AC");

const sendWhatsAppNotification = async (phoneNumber, message) => {
  if (!isConfigured) {
    console.warn("WhatsApp not configured - skipping notification");
    return null;
  }

  try {
    const response = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
    });

    console.log("WhatsApp message sent successfully:", response.sid);
    return response;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
};

const sendStudyReadyNotification = async (patient, doctor, studyType) => {
  const message = `
🏥 *Portal Médico - Estudio Disponible*

Estimado/a ${patient.name},

Su estudio médico está listo para ser consultado:

📋 *Detalles del Estudio:*
• Tipo: ${studyType}
• Doctor: ${doctor.name}
• Fecha: ${new Date().toLocaleDateString("es-ES")}

Puede acceder a sus resultados iniciando sesión en el Portal Médico con su DNI.

🔐 *Acceso:*
• Usuario: Su DNI
• Contraseña: Su DNI (por defecto)

Gracias por confiar en nuestro centro médico.
  `.trim();

  return await sendWhatsAppNotification(patient.phone, message);
};

const sendReportReadyNotification = async (patient, doctor, studyType) => {
  const message = `
📋 *Portal Médico - Informe Disponible*

Estimado/a ${patient.name},

El informe médico de su estudio está disponible:

📋 *Detalles:*
• Tipo de estudio: ${studyType}
• Doctor: ${doctor.name}
• Fecha: ${new Date().toLocaleDateString("es-ES")}

Puede descargar el informe completo en formato PDF desde el Portal Médico.

🔐 *Acceso:*
• Usuario: Su DNI
• Contraseña: Su DNI (por defecto)

Gracias por confiar en nuestro centro médico.
  `.trim();

  return await sendWhatsAppNotification(patient.phone, message);
};

module.exports = {
  sendWhatsAppNotification,
  sendStudyReadyNotification,
  sendReportReadyNotification,
};
