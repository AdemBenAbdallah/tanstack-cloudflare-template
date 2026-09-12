import { motion } from "motion/react";
import type React from "react";
import { type ReactNode, useEffect, useRef } from "react";
import { useDragDrop } from "@/features/schedule/contexts/dnd-context";
import type { IEvent } from "@/features/schedule/interfaces";

interface DraggableEventProps {
  event: IEvent;
  children: ReactNode;
  className?: string;
}

export function DraggableEvent({
  event,
  children,
  className,
}: DraggableEventProps) {
  const { startDrag, endDrag, isDragging, draggedEvent } = useDragDrop();
  const ref = useRef<HTMLDivElement>(null);

  const isCurrentlyDragged = isDragging && draggedEvent?.id === event.id;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  // Native listener: Firefox requires setData on dragstart, and motion's
  // synthetic drag event types don't expose the DOM DragEvent.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onNativeDragStart = (ev: DragEvent) => {
      ev.dataTransfer?.setData("text/plain", event.id);
    };
    el.addEventListener("dragstart", onNativeDragStart);
    return () => el.removeEventListener("dragstart", onNativeDragStart);
  }, [event.id]);

  return (
    <motion.div
      ref={ref}
      className={`${className || ""} ${isCurrentlyDragged ? "opacity-50 cursor-grabbing" : "cursor-grab"}`}
      draggable
      onClick={(e: React.MouseEvent<HTMLDivElement>) => handleClick(e)}
      onDragStart={() => {
        startDrag(event);
      }}
      onDragEnd={() => {
        endDrag();
      }}
    >
      {children}
    </motion.div>
  );
}
