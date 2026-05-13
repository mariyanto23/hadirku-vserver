import { useMemo } from "react";
import { format, eachDayOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getAttendanceByDateRange } from "@/lib/database";
import { useStudents } from "@/hooks/useStudents";

interface AttendanceTrendChartProps {
  dateFrom: Date;
  dateTo: Date;
  embedded?: boolean;
}

export function AttendanceTrendChart({ dateFrom, dateTo, embedded = false }: AttendanceTrendChartProps) {
  const { data: students = [] } = useStudents();
  const totalStudents = students.length;

  const startDate = format(dateFrom, "yyyy-MM-dd");
  const endDate = format(dateTo, "yyyy-MM-dd");

  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ["attendance-range", startDate, endDate],
    queryFn: () => getAttendanceByDateRange(startDate, endDate),
  });

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
    
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayRecords = attendanceData.filter(r => r.date === dateStr);
      
      const hadir = dayRecords.filter(r => r.status === "hadir").length;
      const terlambat = dayRecords.filter(r => r.status === "terlambat").length;
      const izin = dayRecords.filter(r => r.status === "izin").length;
      const sakit = dayRecords.filter(r => r.status === "sakit").length;
      const tidakHadir = totalStudents - hadir - terlambat - izin - sakit;
      
      return {
        date: dateStr,
        displayDate: format(day, "dd MMM", { locale: localeId }),
        hadir,
        terlambat,
        izin,
        sakit,
        tidakHadir: tidakHadir > 0 ? tidakHadir : 0,
      };
    });
  }, [attendanceData, dateFrom, dateTo, totalStudents]);

  const chartContent = (
    <>
      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Memuat data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorTerlambat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorIzin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorSakit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(280 60% 55%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(280 60% 55%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorTidakHadir" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              width={40}
              allowDecimals={false}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="hadir"
              name="Hadir"
              stroke="hsl(var(--success))"
              fillOpacity={1}
              fill="url(#colorHadir)"
            />
            <Area
              type="monotone"
              dataKey="terlambat"
              name="Terlambat"
              stroke="hsl(var(--warning))"
              fillOpacity={1}
              fill="url(#colorTerlambat)"
            />
            <Area
              type="monotone"
              dataKey="izin"
              name="Izin"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorIzin)"
            />
            <Area
              type="monotone"
              dataKey="sakit"
              name="Sakit"
              stroke="hsl(280 60% 55%)"
              fillOpacity={1}
              fill="url(#colorSakit)"
            />
            <Area
              type="monotone"
              dataKey="tidakHadir"
              name="Tidak Hadir"
              stroke="hsl(var(--destructive))"
              fillOpacity={1}
              fill="url(#colorTidakHadir)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </>
  );

  if (embedded) {
    return chartContent;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Tren Kehadiran
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
