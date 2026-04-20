// Función para generar PDF de informes médicos con diseño Tailwind CSS
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

  const formatDateTime = () => {
    return new Date().toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const generateProtocolNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000);
    return `RX-${year}-${random}`;
  };

  const content = `
    <!DOCTYPE html>
    <html class="light" lang="es">
    <head>
      <meta charset="utf-8"/>
      <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
      <title>Diagnóstico por Imágenes López - Informe Radiológico</title>
      <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      <script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                "on-primary-fixed": "#002020",
                "secondary-container": "#97f3b5",
                "inverse-primary": "#8dd3d3",
                "on-secondary-fixed": "#00210f",
                "surface-container-low": "#f3f4f3",
                "on-secondary-fixed-variant": "#00522d",
                "inverse-on-surface": "#f0f1f0",
                "on-tertiary-fixed": "#241a00",
                "tertiary": "#745b00",
                "on-tertiary-fixed-variant": "#584400",
                "on-tertiary-container": "#4f3d00",
                "error-container": "#ffdad6",
                "outline-variant": "#bec8c8",
                "surface-tint": "#1b6869",
                "tertiary-fixed-dim": "#eac249",
                "on-primary-fixed-variant": "#004f50",
                "inverse-surface": "#2e3131",
                "surface-bright": "#f9f9f9",
                "primary": "#004242",
                "on-error-container": "#93000a",
                "on-error": "#ffffff",
                "on-secondary": "#ffffff",
                "error": "#ba1a1a",
                "primary-fixed": "#a8efef",
                "on-surface": "#1a1c1c",
                "surface-container": "#edeeee",
                "secondary-fixed-dim": "#7ed99e",
                "on-secondary-container": "#047240",
                "on-primary": "#ffffff",
                "surface-container-lowest": "#ffffff",
                "background": "#f9f9f9",
                "secondary-fixed": "#9af6b8",
                "outline": "#6f7979",
                "tertiary-container": "#cda72f",
                "surface-dim": "#d9dada",
                "surface-container-highest": "#e2e3e2",
                "surface-variant": "#e2e3e2",
                "surface-container-high": "#e7e8e8",
                "secondary": "#006d3d",
                "on-tertiary": "#ffffff",
                "on-primary-container": "#8bd0d1",
                "on-background": "#1a1c1c",
                "surface": "#f9f9f9",
                "primary-container": "#005b5c",
                "tertiary-fixed": "#ffe08b",
                "on-surface-variant": "#3f4948",
                "primary-fixed-dim": "#8dd3d3"
              },
              "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
              },
              "spacing": {},
              "fontFamily": {
                "headline": ["Inter"],
                "body": ["Inter"],
                "label": ["Inter"]
              }
            },
          },
        }
      </script>
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #f9f9f9; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        @media print {
            body { background-color: white; }
            .print-container { width: 210mm; height: 297mm; padding: 20mm; margin: 0; box-shadow: none; }
            .no-print { display: none; }
        }
        /* Custom A4 Page Simulation for Screen */
        .a4-page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 2rem auto;
            background: white;
            box-shadow: 0 0 40px rgba(0,0,0,0.03);
            position: relative;
        }
        .editorial-line {
            height: 1px;
            background: linear-gradient(to right, #004242 50%, #e2e3e2 40%);
            opacity: 0.5;
        }
      </style>
    </head>
    <body class="bg-surface text-on-surface antialiased">
      <!-- Main Content Canvas -->
      <main class="a4-page flex flex-col">
        <!-- Header Section -->
        <header class="flex justify-between items-start mb-8">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full overflow-hidden bg-surface-container-low flex items-center justify-center">
              <img src="/src/assets/img/loogo.png" alt="Logo Diagnóstico López" class="w-12 h-12 object-contain" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-widest text-outline">Centro de Diagnóstico</span>
              <h1 class="text-primary font-bold text-lg tracking-tight leading-none">Diagnóstico por Imágenes López</h1>
            </div>
          </div>

          <div class="text-right text-xs text-on-surface-variant leading-relaxed">
            <p><span class="font-bold text-primary">Protocolo:</span> #${generateProtocolNumber()}</p>
            <p><span class="font-bold text-primary">Fecha Emisión:</span> ${formatDateTime()}</p>
            <p><span class="font-bold text-primary">Estado:</span> <span class="text-secondary font-semibold">VALIDADO</span></p>
          </div>
        </header>
        
        <!-- Divider -->
        <div class="editorial-line mb-8"></div>
        
        <!-- Patient & Study Grid -->
        <section class="grid grid-cols-2 gap-x-12 gap-y-6 mb-10">
          <!-- Patient Data -->
          <div class="space-y-4">
            <h3 class="text-[10px] uppercase tracking-[0.2em] text-primary font-bold border-b border-primary/10 pb-1">Datos del Paciente</h3>
            <div class="grid grid-cols-3 gap-2 text-sm">
              <span class="text-primary font-bold">Paciente:</span>
              <span class="col-span-2 text-on-surface font-medium">${study.patientName || "N/A"}</span>
              <span class="text-primary font-bold">ID / DNI:</span>
              <span class="col-span-2 text-on-surface-variant">${study.patientDni || "N/A"}</span>
              <span class="text-primary font-bold">Teléfono:</span>
              <span class="col-span-2 text-on-surface-variant">${study.patient?.phone || "N/A"}</span>
            </div>
          </div>
          
          <!-- Study Data -->
          <div class="space-y-4">
            <h3 class="text-[10px] uppercase tracking-[0.2em] text-primary font-bold border-b border-primary/10 pb-1">Detalles del Estudio</h3>
            <div class="grid grid-cols-3 gap-2 text-sm">
              <span class="text-primary font-bold">Estudio:</span>
              <span class="col-span-2 text-on-surface font-medium">${study.studyType || study.type || "N/A"}</span>
              <span class="text-primary font-bold">Médico:</span>
              <span class="col-span-2 text-on-surface-variant">${study.doctorName || study.doctor?.name || "N/A"}</span>
              <span class="text-primary font-bold">Fecha:</span>
              <span class="col-span-2 text-on-surface-variant">${formatStudyDate(study.studyDate || study.date)}</span>
            </div>
          </div>
        </section>
        
        <!-- Report Content -->
        <div class="bg-surface-container-lowest rounded-xl p-8 flex-grow border border-surface-container-high">
          <article class="prose prose-slate max-w-none">
            <section class="mb-10">
              <h2 class="text-primary font-extrabold tracking-tight text-sm uppercase mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                INFORME
              </h2>
              <div class="text-on-surface leading-relaxed text-sm space-y-4 font-normal text-justify">
                <p>${report.content || "Sin contenido del informe"}</p>
              </div>
            </section>
            
            <section class="pt-6 border-t border-surface-container">
              <h2 class="text-primary font-extrabold tracking-tight text-sm uppercase mb-4 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                Impresión (Impression)
              </h2>
              <div class="bg-surface-container-low/50 p-6 rounded-lg border-l-4 border-primary/20">
                <ul class="list-disc list-inside text-on-surface leading-relaxed text-sm space-y-2 font-medium">
                  <li>Estudio radiológico completado satisfactoriamente.</li>
                  <li>Se recomienda correlación clínica para interpretación definitiva.</li>
                  <li>Resultados disponibles para consulta médica.</li>
                </ul>
              </div>
            </section>
          </article>
        </div>
        
        <!-- Signature Block -->
        <section class="mt-12 self-end w-64 text-right">
          <div class="mb-2">
            <div class="w-32 h-16 border-b-2 border-primary/30 ml-auto"></div>
          </div>
          <div class="space-y-0.5">
            <p class="text-sm font-bold text-primary">Dr. ${study.doctorName || study.doctor?.name || "Médico Radiólogo"}</p>
            <p class="text-[10px] text-on-surface-variant uppercase tracking-wider">Especialista en Diagnóstico por Imágenes</p>
          </div>
        </section>
        
        <!-- Footer -->
        <footer class="mt-auto pt-10 border-t border-surface-container-high">
          <div class="flex justify-between items-end">
            <div class="max-w-md">
              <p class="text-[9px] text-outline leading-tight mb-2">
                Este informe es un documento médico-legal generado electrónicamente y validado mediante firma digital. La interpretación definitiva debe ser realizada por el médico tratante en correlación con el cuadro clínico del paciente.
              </p>
              <p class="text-[10px] font-semibold text-primary uppercase tracking-tighter">
                Diagnóstico por Imágenes López © ${new Date().getFullYear()}
              </p>
            </div>
            <div class="text-right text-[9px] text-outline">
              <p>Lobo de la Vega 301, Clinica del Pilar </p>
              <p>+54 xxxxxxxxxx | diagnosticolopez2026@gmail.com </p>
            </div>
          </div>
        </footer>
      </main>
      
      <!-- UI Elements for Screen Only -->
      <div class="fixed bottom-8 right-8 flex gap-4 no-print">

      </div>
    </body>
    </html>
  `;

  // Crear una nueva ventana para imprimir
  // console.log("🔍 Opening print window...");
  const printWindow = window.open(
    "",
    "_blank",
    "width=800,height=600,scrollbars=yes,resizable=yes",
  );
  // console.log("🔍 Print window opened:", !!printWindow);

  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    // console.log("🔍 Content written to print window");

    // Esperar a que cargue y luego imprimir
    printWindow.onload = function () {
      // console.log("🔍 Print window loaded, calling print()...");
      setTimeout(() => {
        printWindow.print();
        // Cerrar la ventana después de imprimir
        printWindow.onafterprint = function () {
          printWindow.close();
        };
      }, 500);
    };
  } else {
    console.error("❌ Failed to open print window - popup blocked?");
    alert(
      "No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes en tu navegador e intenta nuevamente.",
    );
  }
};
