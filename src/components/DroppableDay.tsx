import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface DroppableDayProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function DroppableDay({ id, children, className }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''} transition-all`}
    >
      {children}
    </div>
  );
}
