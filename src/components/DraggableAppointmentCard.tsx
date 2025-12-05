import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DraggableAppointmentCardProps {
  id: string;
  children: ReactNode;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  isOverlay?: boolean;
}

export function DraggableAppointmentCard({ 
  id, 
  children, 
  backgroundColor, 
  borderColor,
  className,
  isOverlay = false,
}: DraggableAppointmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform && !isOverlay
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={{ 
        ...style, 
        backgroundColor,
        borderColor,
      }}
      className={cn(
        "border rounded p-3 text-xs space-y-1 relative group cursor-grab active:cursor-grabbing",
        isOverlay && "shadow-lg",
        className
      )}
    >
      {!isOverlay && (
        <div 
          {...listeners} 
          {...attributes}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}
