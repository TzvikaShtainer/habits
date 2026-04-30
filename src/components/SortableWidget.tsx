import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

interface Props {
  id: string;
  children: ReactNode;
}

function GripIcon() {
  return (
    <svg width="10" height="18" viewBox="0 0 10 18" fill="currentColor" aria-hidden>
      <circle cx="2.5" cy="3" r="1.5" />
      <circle cx="7.5" cy="3" r="1.5" />
      <circle cx="2.5" cy="9" r="1.5" />
      <circle cx="7.5" cy="9" r="1.5" />
      <circle cx="2.5" cy="15" r="1.5" />
      <circle cx="7.5" cy="15" r="1.5" />
    </svg>
  );
}

export function SortableWidget({ id, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
      }}
      className={`relative group mb-4 ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Drag handle — subtle, appears on hover, sits at visual-left (RTL end) */}
      <span
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label="גרור רכיב"
        title="גרור לשינוי סדר"
        className={[
          'absolute top-2 left-2 z-20 p-1.5 rounded select-none touch-none',
          'opacity-0 group-hover:opacity-40 hover:!opacity-80',
          'cursor-grab active:cursor-grabbing',
          'text-gray-400 dark:text-slate-500',
          'hover:bg-gray-200/60 dark:hover:bg-slate-700/60',
          'transition-opacity',
          isDragging ? 'cursor-grabbing' : '',
        ].join(' ')}
      >
        <GripIcon />
      </span>

      {/* Content wrapper — adds lift shadow while dragging */}
      <div className={isDragging ? 'shadow-2xl rounded-xl ring-2 ring-blue-400/30' : ''}>
        {children}
      </div>
    </div>
  );
}
