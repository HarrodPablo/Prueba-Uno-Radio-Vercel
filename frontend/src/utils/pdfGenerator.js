// Función para generar PDF de informes médicos
export const generatePDF = (report, study) => {
  // console.log("🔍 generatePDF called with:", { report, study });

  const formatStudyDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    // Ajustar para evitar problemas de zona horaria
    const localDate = new Date(
      date.getTime() + date.getTimezoneOffset() * 60000,
    );

    return localDate.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .patient-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .study-info {
          margin-bottom: 20px;
        }
        .report-content {
          margin: 20px 0;
          text-align: justify;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .signature {
          margin-top: 50px;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="text-center">INFORME MÉDICO</h1>
        <h2>${study.studyType || study.type || "Estudio"}</h2>
      </div>
      
      <div class="patient-info">
        <h3>Datos del Paciente</h3>
        <p><strong>Nombre:</strong> ${study.patientName || "N/A"}</p>
        <p><strong>DNI:</strong> ${study.patientDni || "N/A"}</p>
        <p><strong>Teléfono:</strong> ${study.patient?.phone || "N/A"}</p>
      </div>
      
      <div class="study-info">
        <h3>Datos del Estudio</h3>
        <p><strong>Fecha:</strong> ${formatStudyDate(study.studyDate || study.date)}</p>
        <p><strong>Tipo de Estudio:</strong> ${study.studyType || study.type || "N/A"}</p>
        <p><strong>Médico:</strong> ${study.doctorName || study.doctor?.name || "N/A"}</p>
      </div>
      
      <div class="report-content">
        <h3>Informe Radiológico</h3>
        <p>${report.content}</p>
      </div>
      
 
      <div class="footer">
        <p>Diagnóstico por Imágenes López</p>
        <p>Generado el ${new Date().toLocaleDateString("es-AR")}</p>
      </div>
    </body>
    </html>
  `;

  // Crear una nueva ventana para imprimir
  // console.log("🔍 Opening print window...");
  const printWindow = window.open("", "_blank");
  // console.log("🔍 Print window opened:", !!printWindow);

  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    // console.log("🔍 Content written to print window");

    // Esperar a que cargue y luego imprimir
    printWindow.onload = function () {
      // console.log("🔍 Print window loaded, calling print()...");
      printWindow.print();
    };
  } else {
    console.error("❌ Failed to open print window - popup blocked?");
    alert(
      "No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes en tu navegador e intenta nuevamente.",
    );
  }
};
