"use client";

import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarChartItem {
  key: string;
  label: string;
  score: number;
  maxScore: number;
}

interface RadarChartProps {
  items: RadarChartItem[];
}

export function RadarChart({ items }: RadarChartProps) {
  // 0~100 정규화하여 시각화
  const normalized = items.map((item) => ({
    subject: item.label,
    score: item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0,
    fullMark: 100,
    rawScore: item.score,
    maxScore: item.maxScore,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsRadarChart data={normalized}>
        <PolarGrid stroke="#e4e4e7" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#71717a" }} />
        <Tooltip
          formatter={(value, _name, props) => [
            `${props.payload.rawScore} / ${props.payload.maxScore}점`,
            "",
          ]}
        />
        <Radar
          dataKey="score"
          stroke="#18181b"
          fill="#18181b"
          fillOpacity={0.15}
          dot={{ r: 3, fill: "#18181b" }}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
