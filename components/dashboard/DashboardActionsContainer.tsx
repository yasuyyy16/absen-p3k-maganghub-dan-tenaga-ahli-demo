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
  todayAttendance,
}: DashboardActionsContainerProps) {
  const [liveLocation, setLiveLocation] = useState<LocationPayload | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const needsLiveLocation = !isCheckedOut;
    console.log('DashboardActionsContainer watcher check:', {
      isCheckedIn,
      isCheckedOut,
      isLeave,
      needsLiveLocation,
      liveLocation,
    });

    if (!needsLiveLocation) {
      setIsLoading(false);
      setLiveLocation(null);
      return;
    }

    setIsLoading(true);
    const cleanup = watchBrowserLocation(
      (location) => {
        console.log('DashboardActionsContainer GPS callback success:', location.latitude, location.longitude);
        setLiveLocation(location);
        setLiveError(null);
        setIsLoading(false);
      },
      (error) => {
        console.error('DashboardActionsContainer GPS callback error:', error);
        setLiveError(error);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('DashboardActionsContainer cleanup watcher');
      cleanup();
    };
  }, [isCheckedIn, isCheckedOut, isLeave]);

  useEffect(() => {
    console.log('DashboardActionsContainer props to AttendanceLocationCard:', {
      liveLocation,
      isLoading,
      liveError,
    });
  }, [liveLocation, isLoading, liveError]);

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
            liveLocation={liveLocation}
            liveError={liveError}
          />

          <AbsenPulangCard
            isCheckedIn={isCheckedIn}
            isCheckedOut={isCheckedOut}
            checkOutTimeFormatted={checkOutTimeFormatted}
            isLeave={false}
            isWeekend={isWeekend}
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
        liveLatitude={liveLocation?.latitude}
        liveLongitude={liveLocation?.longitude}
        liveAccuracy={liveLocation?.accuracy}
        isLiveLoading={isLoading}
        liveError={liveError}
      />
    </div>
  );
}
