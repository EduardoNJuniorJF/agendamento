import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface DraggableAppointmentCardProps {
  id: string;
  children: ReactNode;
  backgroundColor?: string;
  borderColor?: string;
}

export function DraggableAppointmentCard({ 
  id, 
  children, 
  backgroundColor, 
  borderColor 
}: DraggableAppointmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style, 
        backgroundColor,
        borderColor,
      }}
      className="border rounded p-3 text-xs space-y-1 relative group cursor-grab active:cursor-grabbing"
    >
      <div 
        {...listeners} 
        {...attributes}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
