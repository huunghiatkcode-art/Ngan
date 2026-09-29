"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface QuestionStat {
  questionId: string;
  title: string | null;
  content: string;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
}

export default function QuestionAccuracyChart({ data }: { data: QuestionStat[] }) {
  if (!data.length) return <p className="text-sm text-[var(--muted)]">Chưa có dữ liệu câu hỏi.</p>;

  const chartData = data.map((d, i) => ({
    name: d.title?.trim() || `Câu ${i + 1}`,
    accuracy: d.accuracy,
    fullLabel: d.title?.trim() || d.content.slice(0, 60) || `Câu ${i + 1}`,
  }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            formatter={(value) => [`${value}%`, "Độ chính xác"]}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
          />
          <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.accuracy >= 70 ? "#16a34a" : d.accuracy >= 40 ? "#d97706" : "#dc2626"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
