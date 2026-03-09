"use client";

import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarChartProps {
  scores: {
    completeness: number;
    creativity: number;
    technical: number;
    presentation: number;
  };
}

export function RadarChart({ scores }: RadarChartProps) {
  const data = [
    { subject: "완성도", score: scores.completeness, fullMark: 30 },
    { subject: "창의성", score: scores.creativity, fullMark: 25 },
    { subject: "기술", score: scores.technical, fullMark: 25 },
    { subject: "발표/문서화", score: scores.presentation, fullMark: 20 },
  ];

  // 0~100 정규화하여 시각화
  const normalized = data.map((d) => ({
    subject: d.subject,
    score: Math.round((d.score / d.fullMark) * 100),
    fullMark: 100,
    rawScore: d.score,
    maxScore: d.fullMark,
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
