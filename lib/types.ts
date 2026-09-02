import type {
  PersonnelType,
  AttendanceStatus,
  Role,
  users,
  attendance_users,
  attendances,
  interns,
  non_nip_employees,
  intern_batches,
} from '@prisma/client';

export type {
  PersonnelType,
  AttendanceStatus,
  Role,
  users,
  attendance_users,
  attendances,
  interns,
  non_nip_employees,
  intern_batches,
};

export interface SessionPayload {
  userId: number;
  username: string;
  nama: string;
  role: Role;
  personId?: number;
  personType?: PersonnelType;
}

export type PersonnelCategory = 'Tenaga Ahli' | 'MagangHub' | 'Magang Biasa';

export const VALID_PERSONNEL_CATEGORIES: readonly PersonnelCategory[] = [
  'Tenaga Ahli',
  'MagangHub',
  'Magang Biasa',
] as const;

export interface PersonDetails {
  id: number;
  username: string;
  nama: string;
  role: Role;
  jenisPersonel: string | null;
  universitas: string | null;
  jurusan?: string | null;
  isActive: boolean;
  personType?: PersonnelType;
  usernameChanged?: boolean;
  detail?: {
    jurusan?: string;
    universitas?: string;
    batchId?: number;
    batchNama?: string;
    jabatan?: string | null;
    statusKepegawaian?: string;
  };
}

export interface WibDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dateString: string; // 'YYYY-MM-DD'
  dateObj: Date; // UTC midnight date representation for PostgreSQL @db.Date
}

export interface WibTimeParts {
  hours: number;
  minutes: number;
  seconds: number;
  timeString: string; // 'HH:mm:ss'
  timeFormatted: string; // 'HH:mm WIB'
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export type AttendanceTodayState =
  | {
      type: 'NOT_RECORDED';
    }
  | {
      type: 'CHECKED_IN';
      checkInTime: Date;
      checkInFormatted: string;
      isReminderActive: boolean;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      address?: string | null;
    }
  | {
      type: 'COMPLETED';
      checkInTime: Date;
      checkOutTime: Date;
      checkInFormatted: string;
      checkOutFormatted: string;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      address?: string | null;
      latitude_out?: number | null;
      longitude_out?: number | null;
      accuracy_out?: number | null;
      address_out?: string | null;
    }
  | {
      type: 'LEAVE';
      status: 'IZIN' | 'SAKIT';
      notes: string | null;
    };

export interface AttendanceHistoryItem {
  id: number;
  date: Date;
  dateFormatted: string;
  checkInFormatted: string | null;
  checkOutFormatted: string | null;
  status: AttendanceStatus;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  latitude_out: number | null;
  longitude_out: number | null;
  accuracy_out: number | null;
  address_out: string | null;
  proof_file_url: string | null;
}

export interface AttendanceHistoryResult {
  items: AttendanceHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
