import { prisma } from './prisma';
import { PersonnelType } from '@prisma/client';
import { PersonDetails } from './types';

/**
 * Resolves user profile details directly from the shared `users` table by user ID.
 * Returns null if user is not found or inactive.
 */
export async function resolveUserProfile(userId: number): Promise<PersonDetails | null> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      nama: true,
      role: true,
      jenis_personel: true,
      universitas: true,
      is_active: true,
    },
  });

  if (!user || !user.is_active || user.role !== 'VIEWER') {
    return null;
  }

  const isTenagaAhli = user.jenis_personel?.trim().toLowerCase() === 'tenaga ahli';
  const personType: PersonnelType = isTenagaAhli ? 'TENAGA_AHLI' : 'MAGANG';

  return {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: 'VIEWER',
    jenisPersonel: user.jenis_personel,
    universitas: user.universitas,
    isActive: user.is_active,
    personType,
    detail: {
      universitas: user.universitas ?? undefined,
    },
  };
}

/**
 * Flexible person resolution supporting:
 * 1. resolvePerson(userId: number) -> direct `users` table lookup
 * 2. resolvePerson(personType: PersonnelType, personId: number) -> tries `users` first, then legacy `interns`/`non_nip_employees`
 */
export async function resolvePerson(
  personTypeOrUserId: PersonnelType | number,
  optionalPersonId?: number
): Promise<PersonDetails | null> {
  // Overload 1: called with userId (number)
  if (typeof personTypeOrUserId === 'number') {
    return resolveUserProfile(personTypeOrUserId);
  }

  const personType = personTypeOrUserId;
  const personId = optionalPersonId;

  if (!personId) {
    return null;
  }

  // 1. Try finding in `users` table first (single-user architecture)
  const user = await prisma.users.findUnique({
    where: { id: personId },
  });

  if (user && user.is_active) {
    return resolveUserProfile(user.id);
  }

  // 2. Legacy fallback for historical data referencing interns or non_nip_employees
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
      username: intern.nama.toLowerCase().replace(/\s+/g, ''),
      nama: intern.nama,
      role: 'VIEWER',
      personType: 'MAGANG',
      jenisPersonel: 'MagangHub',
      universitas: intern.universitas,
      jurusan: intern.jurusan,
      isActive: true,
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

    return {
      id: nonNip.id,
      username: nonNip.nama.toLowerCase().replace(/\s+/g, ''),
      nama: nonNip.nama,
      role: 'VIEWER',
      personType: 'TENAGA_AHLI',
      jenisPersonel: 'Tenaga Ahli',
      universitas: nonNip.universitas,
      isActive: true,
      detail: {
        statusKepegawaian: nonNip.status_kepegawaian,
        jabatan: nonNip.jabatan,
        universitas: nonNip.universitas ?? undefined,
      },
    };
  }

  return null;
}
