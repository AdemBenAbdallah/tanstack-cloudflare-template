import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useLocale } from "@/i18n";

function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserSelect() {
  const { t } = useLocale();
  const { users, selectedUserId, filterEventsBySelectedUser } = useCalendar();

  return (
    <Select
      value={selectedUserId ?? "all"}
      onValueChange={filterEventsBySelectedUser}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t.schedule.instructors.select} />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="all">
          <span className="flex items-center">
            <span className="mx-2 flex items-center -space-x-2">
              {users.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="size-6 ring-2 ring-background">
                  <AvatarFallback className="text-[10px]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </span>
            {t.schedule.instructors.all}
          </span>
        </SelectItem>

        {users.map((user) => (
          <SelectItem
            key={user.id}
            value={user.id}
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Avatar key={user.id} className="size-6">
                <AvatarFallback className="text-[10px]">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>

              <p className="truncate">{user.name}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
