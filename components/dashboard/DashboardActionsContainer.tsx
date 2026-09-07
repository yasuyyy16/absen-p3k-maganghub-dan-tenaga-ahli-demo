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
  todayAttendance: any;
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
  const [liveLocation, setLiveLocation] = useState<LocationPayload | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isFriday && !isCheckedOut);

  useEffect(() => {
    // Friday is WFA: No geolocation watcher is executed, and no GPS is requested.
    const needsLiveLocation = !isFriday && !isWeekend && !isCheckedOut && !isLeave;

    if (!needsLiveLocation) {
      setIsLoading(false);
      setLiveLocation(null);
      setLiveError(null);
      return;
    }

    setIsLoading(true);
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
  }, [isCheckedIn, isCheckedOut, isLeave, isFriday, isWeekend]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Attendance Actions Grid */}
      {!isLeave && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <AbsenPagiCard
            isCheckedIn={isCheckedIn}
            checkInTimeFormatted={checkInTimeFormatted}
            isLeave={false}
            isWeekend={isWeekend}
            isWindowClosed={isWindowClosed}
            isFriday={isFriday}
            liveLocation={liveLocation}
            liveError={liveError}
          />

          <AbsenPulangCard
            isCheckedIn={isCheckedIn}
            isCheckedOut={isCheckedOut}
            checkOutTimeFormatted={checkOutTimeFormatted}
            isLeave={false}
            isWeekend={isWeekend}
            isFriday={isFriday}
            liveLocation={liveLocation}
            liveError={liveError}
          />
        </div>
      )}

      {/* Map Preview (Live or Recorded) */}
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
        liveLatitude={liveLocation?.latitude}
        liveLongitude={liveLocation?.longitude}
        liveAccuracy={liveLocation?.accuracy}
        isLiveLoading={isLoading}
        liveError={liveError}
      />
    </div>
  );
}
