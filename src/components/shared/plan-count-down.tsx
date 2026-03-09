"use client";
import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import LoadingBubbles from "@/components/shared/loading-bubbles";
import {
  TimeDifference,
  getExpirationCountDown,
} from "@/lib/utils/getFormattedDate";

interface CountDownProps {
  endDate: Date;
  startDate?: Date;
  className?: string;
  wrapped?: boolean;
}

export default function PlanCountDown({
  endDate,
  startDate = new Date(),
  className:
    style = "inline-flex items-center justify-center rounded bg-black p-1 text-xxs leading-none text-white",
  wrapped = false,
}: CountDownProps) {
  const [countdown, setCountdown] = useState<string>("");
  const [timeUp, setTimeUp] = useState<boolean>(false);

  const parsedStartDate = useMemo(() => new Date(startDate), [startDate]);
  const parsedEndDate = useMemo(() => new Date(endDate), [endDate]);
  const isTimeUp = parsedStartDate >= parsedEndDate;

  useEffect(() => {
    if (isTimeUp) {
      setTimeUp(true);
      return;
    }

    const interval = setInterval(() => {
      const countdownValue: TimeDifference = {
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        ...getExpirationCountDown(parsedStartDate, parsedEndDate),
      };
      setCountdown(formatCountdown(countdownValue));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimeUp, parsedStartDate, parsedEndDate]);

  const formatCountdown = (time: TimeDifference) => {
    const parts = [];
    if (time.years) parts.push(`${time.years}y`);
    if (time.months) parts.push(`${time.months}mo`);
    if (time.days) parts.push(`${time.days}d`);
    if (time.hours !== undefined)
      parts.push(`${time.hours < 10 ? "0" : ""}${time.hours}h`);
    if (time.minutes !== undefined)
      parts.push(`${time.minutes < 10 ? "0" : ""}${time.minutes}m`);
    if (time.seconds !== undefined)
      parts.push(`${time.seconds < 10 ? "0" : ""}${time.seconds}s`);
    return parts.join(" ");
  };

  return wrapped ? (
    <div className={classNames("PlanCountDown", style)}>
      {timeUp ? (
        "Time is up!"
      ) : countdown ? (
        countdown
      ) : (
        <LoadingBubbles size="small" />
      )}
    </div>
  ) : (
    <span className="PlanCountDown">
      {timeUp ? (
        "Time is up!"
      ) : countdown ? (
        countdown
      ) : (
        <LoadingBubbles
          size="small"
          className="inline-flex items-center gap-0.5"
        />
      )}
    </span>
  );
}
