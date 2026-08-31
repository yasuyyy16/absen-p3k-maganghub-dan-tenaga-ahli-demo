import type {
  PersonnelType,
  AttendanceStatus,
  attendance_users,
  attendances,
  interns,
  non_nip_employees,
  intern_batches,
} from '@prisma/client';

export type {
  PersonnelType,
  AttendanceStatus,
  attendance_users,
  attendances,
  interns,
  non_nip_employees,
  intern_batches,
};

export interface SessionPayload {
  userId: number;
  username: string;
  personId: number;
  personType: PersonnelType;
  nama: string;
}

export interface PersonDetails {
  id: number;
  nama: string;
  personType: PersonnelType;
  detail: {
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

export type AttendanceTodayState =
  | {
      type: 'NOT_RECORDED';
    }
  | {
      type: 'CHECKED_IN';
      checkInTime: Date;
      checkInFormatted: string;
      canCheckout: boolean;
      isReminderActive: boolean;
    }
  | {
      type: 'COMPLETED';
      checkInTime: Date;
      checkOutTime: Date;
      checkInFormatted: string;
      checkOutFormatted: string;
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
}

export interface AttendanceHistoryResult {
  items: AttendanceHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
