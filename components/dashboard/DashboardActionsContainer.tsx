'use client';

import { useEffect, useState } from 'react';
import type { LocationPayload } from '@/lib/types';
import { watchBrowserLocation } from '@/lib/geolocation';
import AbsenPagiCard from '@/components/dashboard/AbsenPagiCard';
import AbsenPulangCard from '@/components/dashboard/AbsenPulangCard';
import AttendanceLocationCard from '@/components/dashboard/AttendanceLocationCard';

interface DashboardActionsContainerProps {
  isCheckedIn: boolean;
  checkInTimeFormatted: string | null;
  isCheckedOut: boolean;
  checkOutTimeFormatted: string | null;
  isLeave: boolean;
  isWeekend: boolean;
  isWindowClosed: boolean;
  isFriday?: boolean;
  todayAttendance: {
    status?: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    address?: string | null;
    latitude_out?: number | null;
    longitude_out?: number | null;
    accuracy_out?: number | null;
    address_out?: string | null;
  } | null;
}

export default function DashboardActionsContainer({
  isCheckedIn,
  checkInTimeFormatted,
  isCheckedOut,
  checkOutTimeFormatted,
  isLeave,
  isWeekend,
  isWindowClosed,
  isFriday = false,
  todayAttendance,
}: DashboardActionsContainerProps) {
  const isRapat = todayAttendance?.status === 'RAPAT';
  const needsLiveLocation = !isFriday && !isWeekend && !isCheckedIn && !isLeave && !isRapat;

  const [liveLocation, setLiveLocation] = useState<LocationPayload | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  // Default to true only if we actually need the location initially
  const [isLoading, setIsLoading] = useState(needsLiveLocation);

  useEffect(() => {
    if (!needsLiveLocation) {
      return;
    }

    const cleanup = watchBrowserLocation(
      (location) => {
        setLiveLocation(location);
        setLiveError(null);
        setIsLoading(false);
      },
      (error) => {
        setLiveError(error);
        setIsLoading(false);
      }
    );

    return () => {
      cleanup();
    };
  }, [needsLiveLocation]);

  const displayLiveLocation = needsLiveLocation ? liveLocation : null;
  const displayLiveError = needsLiveLocation ? liveError : null;
  const displayIsLoading = needsLiveLocation ? isLoading : false;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Map Preview (Live or Recorded) */}
      {!isRapat && (
        <AttendanceLocationCard
          latitude={todayAttendance?.latitude ?? null}
          longitude={todayAttendance?.longitude ?? null}
          accuracy={todayAttendance?.accuracy ?? null}
          address={todayAttendance?.address ?? null}
          latitudeOut={todayAttendance?.latitude_out ?? null}
          longitudeOut={todayAttendance?.longitude_out ?? null}
          accuracyOut={todayAttendance?.accuracy_out ?? null}
          addressOut={todayAttendance?.address_out ?? null}
          isFriday={isFriday}
          liveLatitude={displayLiveLocation?.latitude}
          liveLongitude={displayLiveLocation?.longitude}
          liveAccuracy={displayLiveLocation?.accuracy}
          isLiveLoading={displayIsLoading}
          liveError={displayLiveError}
        />
      )}

      {/* Attendance Actions Grid */}
      {!isLeave && !isRapat && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <AbsenPagiCard
            isCheckedIn={isCheckedIn}
            checkInTimeFormatted={checkInTimeFormatted}
            isLeave={false}
            isWeekend={isWeekend}
            isWindowClosed={isWindowClosed}
            isFriday={isFriday}
            liveLocation={displayLiveLocation}
            liveError={displayLiveError}
          />

          <AbsenPulangCard
            isCheckedIn={isCheckedIn}
            isCheckedOut={isCheckedOut}
            checkOutTimeFormatted={checkOutTimeFormatted}
            isLeave={false}
            isWeekend={isWeekend}
            isFriday={isFriday}
            liveLocation={displayLiveLocation}
            liveError={displayLiveError}
          />
        </div>
      )}
    </div>
  );
}
