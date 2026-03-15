import { cn } from '@/lib/utils';

interface UzbekistanFlagProps {
  className?: string;
}

export function UzbekistanFlag({ className }: UzbekistanFlagProps) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={cn('inline-block', className)}
      aria-label="Uzbekistan flag"
    >
      <path fill="#1eb53a" d="M0 320h640v160H0z" />
      <path fill="#0099b5" d="M0 0h640v160H0z" />
      <path fill="#fff" d="M0 153.6h640v172.8H0z" />
      <path fill="#ce1126" d="M0 163.2h640v6.4H0zM0 310.4h640v6.4H0z" />
      <circle cx="134.4" cy="76.8" r="57.6" fill="#fff" />
      <circle cx="153.6" cy="76.8" r="57.6" fill="#0099b5" />
      {/* Stars */}
      {[
        [211.2, 28.8],
        [243.2, 28.8],
        [275.2, 28.8],
        [211.2, 57.6],
        [243.2, 57.6],
        [275.2, 57.6],
        [211.2, 86.4],
        [243.2, 86.4],
        [275.2, 86.4],
        [243.2, 115.2],
        [275.2, 115.2],
        [307.2, 115.2],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="#fff" />
      ))}
    </svg>
  );
}
