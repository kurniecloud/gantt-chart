import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Shared frame: 16px, stroked with the current text colour, hidden from screen readers. */
function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function CirclePlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 5.25v5.5M5.25 8h5.5" />
    </Icon>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5L10.5 8 6 12.5" />
    </Icon>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 3.5L2.5 6.5l3 3" />
      <path d="M2.5 6.5h7a4 4 0 010 8H7" />
    </Icon>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 3.5l3 3-3 3" />
      <path d="M13.5 6.5h-7a4 4 0 000 8H9" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 10.5V2.5M5 5.5l3-3 3 3" />
      <path d="M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.5v8M5 7.5l3 3 3-3" />
      <path d="M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" />
    </Icon>
  );
}

export function DiamondIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.5L13.5 8 8 13.5 2.5 8z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 14V2.5M3.5 3h8l-1.75 2.75L11.5 8.5h-8" />
    </Icon>
  );
}

export function PathIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 4.5h5M5 8h6M9 11.5h5" strokeWidth={2.2} />
    </Icon>
  );
}
