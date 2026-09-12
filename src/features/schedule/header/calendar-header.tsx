"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  slideFromLeft,
  slideFromRight,
  transition,
} from "@/features/schedule/animations";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { AddEditEventDialog } from "@/features/schedule/dialogs/add-edit-event-dialog";
import { DateNavigator } from "@/features/schedule/header/date-navigator";
import FilterEvents from "@/features/schedule/header/filter";
import { TodayButton } from "@/features/schedule/header/today-button";
import { UserSelect } from "@/features/schedule/header/user-select";
import { Settings } from "@/features/schedule/settings/settings";
import { useLocale } from "@/i18n";
import Views from "./view-tabs";

export function CalendarHeader() {
  const { t } = useLocale();
  const { view, events, canCreate } = useCalendar();

  return (
    <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <motion.div
        className="flex items-center gap-3"
        variants={slideFromLeft}
        initial="initial"
        animate="animate"
        transition={transition}
      >
        <TodayButton />
        <DateNavigator view={view} events={events} />
      </motion.div>

      <motion.div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-1.5"
        variants={slideFromRight}
        initial="initial"
        animate="animate"
        transition={transition}
      >
        <div className="options flex-wrap flex items-center gap-4 md:gap-2">
          <FilterEvents />
          <Views />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-1.5">
          <UserSelect />

          {canCreate && (
            <AddEditEventDialog>
              <Button>
                <Plus className="h-4 w-4" />
                {t.schedule.header.addLesson}
              </Button>
            </AddEditEventDialog>
          )}
        </div>
        <Settings />
      </motion.div>
    </div>
  );
}
