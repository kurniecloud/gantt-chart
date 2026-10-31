import { useId } from 'react';
import { DayPicker, type Matcher } from 'react-day-picker';
import 'react-day-picker/style.css';
import { todayISO } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { formatDate, isoToLocalDate, localDateToISO } from '../utils/formatDate';
import styles from './DatePicker.module.css';
import { CalendarIcon } from './icons';

type DatePickerProps = {
  label: string;
  value: ISODate | undefined;
  onChange: (value: ISODate | undefined) => void;
  /** Whether the calendar is showing. Controlled so a parent can keep only one open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Days before this are disabled (e.g. the start date, for an end-date picker). */
  minDate?: ISODate;
  /** Month the calendar opens on when there's no value or minimum (default: today's). */
  openMonth?: ISODate;
  error?: string;
  /** Keep the label for screen readers only (e.g. inside a table with a column header). */
  hideLabel?: boolean;
  /**
   * Group the field belongs to (e.g. "Planned"), prepended to its accessible name so two
   * "Start date" fields can be told apart.
   */
  context?: string;
};

const WEEKENDS: Matcher = { dayOfWeek: [0, 6] };

/** A date field whose calendar only lets weekdays be picked. */
export function DatePicker({
  label,
  value,
  onChange,
  open,
  onOpenChange,
  minDate,
  openMonth,
  error,
  hideLabel = false,
  context,
}: DatePickerProps) {
  const contextId = useId();
  const labelId = useId();
  const buttonId = useId();
  const errorId = useId();
  const calendarId = useId();
  const disabled: Matcher[] = minDate
    ? [WEEKENDS, { before: isoToLocalDate(minDate) }]
    : [WEEKENDS];

  return (
    <div className={styles.field}>
      {context && (
        <span id={contextId} className="visually-hidden">
          {context}
        </span>
      )}
      <span id={labelId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </span>
      <div className={styles.controls}>
        <button
          id={buttonId}
          type="button"
          className={styles.trigger}
          aria-labelledby={`${context ? `${contextId} ` : ''}${labelId} ${buttonId}`}
          aria-expanded={open}
          aria-controls={open ? calendarId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => onOpenChange(!open)}
        >
          <CalendarIcon />
          <span className={value ? undefined : styles.placeholder}>
            {value ? formatDate(value) : 'No date'}
          </span>
        </button>
        {value && (
          <button
            type="button"
            className={styles.clear}
            aria-label={`Clear ${context ? `${context.toLowerCase()} ` : ''}${label.toLowerCase()}`}
            onClick={() => {
              onChange(undefined);
              onOpenChange(false);
            }}
          >
            Clear
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
      {open && (
        <div id={calendarId} className={styles.calendar}>
          <DayPicker
            mode="single"
            autoFocus
            weekStartsOn={1}
            showOutsideDays
            selected={value ? isoToLocalDate(value) : undefined}
            defaultMonth={isoToLocalDate(value ?? minDate ?? openMonth ?? todayISO())}
            disabled={disabled}
            onSelect={(date) => {
              if (date) onChange(localDateToISO(date));
              onOpenChange(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
