import { prisma } from './prisma';
import { PersonnelType } from '@prisma/client';
import { PersonDetails } from './types';

/**
 * Resolves person details polymorphically based on personType and personId.
 * - MAGANG: queries `interns` table (joined with `intern_batches`)
 * - TENAGA_AHLI: queries `non_nip_employees` table and verifies status_kepegawaian = "Tenaga Ahli"
 */
export async function resolvePerson(
  personType: PersonnelType,
  personId: number
): Promise<PersonDetails | null> {
  if (personType === 'MAGANG') {
    const intern = await prisma.interns.findUnique({
      where: { id: personId },
      include: {
        intern_batches: true,
      },
    });

    if (!intern) {
      return null;
    }

    return {
      id: intern.id,
      nama: intern.nama,
      personType: 'MAGANG',
      detail: {
        jurusan: intern.jurusan,
        universitas: intern.universitas,
        batchId: intern.batch_id,
        batchNama: intern.intern_batches?.nama,
      },
    };
  }

  if (personType === 'TENAGA_AHLI') {
    const nonNip = await prisma.non_nip_employees.findUnique({
      where: { id: personId },
    });

    if (!nonNip) {
      return null;
    }

    // Tenaga Ahli must have status_kepegawaian matching "Tenaga Ahli"
    if (nonNip.status_kepegawaian?.trim().toLowerCase() !== 'tenaga ahli') {
      return null;
    }

    return {
      id: nonNip.id,
      nama: nonNip.nama,
      personType: 'TENAGA_AHLI',
      detail: {
        statusKepegawaian: nonNip.status_kepegawaian,
        jabatan: nonNip.jabatan,
        universitas: nonNip.universitas ?? undefined,
      },
    };
  }

  return null;
}
