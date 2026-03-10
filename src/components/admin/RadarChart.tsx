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
    documentation: number;
    implementation: number;
    ux: number;
    idea: number;
  };
}

export function RadarChart({ scores }: RadarChartProps) {
  const data = [
    { subject: "문서화", score: scores.documentation, fullMark: 35 },
    { subject: "구현력", score: scores.implementation, fullMark: 25 },
    { subject: "완성도/UX", score: scores.ux, fullMark: 25 },
    { subject: "아이디어", score: scores.idea, fullMark: 15 },
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
