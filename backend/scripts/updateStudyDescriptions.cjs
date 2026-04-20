const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateStudyDescriptions() {
  try {
    console.log('🔄 Actualizando StudyDescription para estudios existentes...');
    
    // Obtener todos los estudios que no tienen StudyDescription
    const studies = await prisma.study.findMany({
      where: {
        StudyDescription: null
      }
    });

    console.log(`📊 Encontrados ${studies.length} estudios sin StudyDescription`);

    // Actualizar cada estudio con su type como StudyDescription
    for (const study of studies) {
      await prisma.study.update({
        where: { id: study.id },
        data: {
          StudyDescription: study.type || 'Sin descripción'
        }
      });
      console.log(`✅ Actualizado estudio ${study.id}: ${study.type} -> ${study.type || 'Sin descripción'}`);
    }

    console.log('✅ Actualización completada');
  } catch (error) {
    console.error('❌ Error actualizando StudyDescription:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStudyDescriptions();
