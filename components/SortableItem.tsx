import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../utils';

interface SortableItemProps {
  id: string;
  children: (args: {
    attributes: any;
    listeners: any;
    isDragging: boolean;
    handleProps: any;
  }) => React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, children, className, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(className, isDragging && 'opacity-80 scale-[1.02]')}>
      {children({
        attributes,
        listeners,
        isDragging,
        handleProps: { ...attributes, ...listeners },
      })}
    </div>
  );
};
