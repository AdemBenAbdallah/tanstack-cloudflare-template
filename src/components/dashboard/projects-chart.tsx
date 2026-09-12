import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocale } from "@/i18n";

const chartData = [
  { date: "2024-04-01", projects: 12, members: 8 },
  { date: "2024-04-08", projects: 18, members: 11 },
  { date: "2024-04-15", projects: 15, members: 9 },
  { date: "2024-04-22", projects: 24, members: 14 },
  { date: "2024-04-29", projects: 31, members: 19 },
  { date: "2024-05-06", projects: 28, members: 22 },
  { date: "2024-05-13", projects: 36, members: 25 },
  { date: "2024-05-20", projects: 33, members: 21 },
  { date: "2024-05-27", projects: 42, members: 30 },
  { date: "2024-06-03", projects: 39, members: 27 },
  { date: "2024-06-10", projects: 47, members: 34 },
  { date: "2024-06-17", projects: 52, members: 38 },
  { date: "2024-06-24", projects: 49, members: 35 },
  { date: "2024-06-30", projects: 58, members: 41 },
];

export function ProjectsChart() {
  const { t, locale } = useLocale();
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  const chartConfig = {
    projects: { label: t.chart.projects, color: "var(--primary)" },
    members: { label: t.chart.members, color: "var(--primary)" },
  } satisfies ChartConfig;

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date("2024-06-30");
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    else if (timeRange === "7d") daysToSubtract = 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  const dateLocale = locale === "ar" ? "ar" : "en-US";
  const formatDay = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
    });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t.chart.title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {t.chart.description}
          </span>
          <span className="@[540px]/card:hidden">{t.chart.description}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">{t.chart.range90}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t.chart.range30}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{t.chart.range7}</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 @[767px]/card:hidden"
              size="sm"
              aria-label={t.chart.title}
            >
              <SelectValue placeholder={t.chart.range90} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                {t.chart.range90}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                {t.chart.range30}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                {t.chart.range7}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillProjects" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-projects)"
                  stopOpacity={1}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-projects)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMembers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-members)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-members)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => formatDay(String(value))}
              reversed={locale === "ar"}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatDay(String(label))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="members"
              type="natural"
              fill="url(#fillMembers)"
              stroke="var(--color-members)"
              stackId="a"
            />
            <Area
              dataKey="projects"
              type="natural"
              fill="url(#fillProjects)"
              stroke="var(--color-projects)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
