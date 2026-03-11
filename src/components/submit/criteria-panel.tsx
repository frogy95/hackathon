"use client";

import { ROLE_CRITERIA } from "@/lib/role-criteria";
import type { JobRole } from "@/types";

interface CriteriaPanelProps {
  jobRole: string | undefined;
}

export function CriteriaPanel({ jobRole }: CriteriaPanelProps) {
  const criteria = jobRole ? ROLE_CRITERIA[jobRole as JobRole] : undefined;
  const totalMax = criteria ? criteria.reduce((sum, c) => sum + c.maxScore, 0) : 0;

  if (!criteria) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-center p-6">
        <p className="text-sm text-zinc-500 font-medium">직군을 선택하면</p>
        <p className="text-sm text-zinc-400 mt-1">해당 직군의 평가 기준이 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">{jobRole} 평가 기준</h2>
        <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">
          기본 {totalMax}점 + 보너스 최대 10점
        </span>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => {
          const pct = Math.round((criterion.maxScore / totalMax) * 100);
          return (
            <div key={criterion.key} className="rounded-lg border border-zinc-100 bg-white p-4 shadow-sm">
              {/* 헤더: 기준명 + 배점 */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-zinc-900">{criterion.name}</span>
                <span className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {criterion.maxScore}점
                </span>
              </div>

              {/* 프로그레스 바 */}
              <div className="h-1.5 rounded-full bg-zinc-100 mb-2">
                <div
                  className="h-1.5 rounded-full bg-blue-400"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* 기준 설명 */}
              <p className="text-xs text-zinc-500 mb-3">{criterion.description}</p>

              {/* 세부 항목 */}
              <ul className="space-y-2">
                {criterion.subItems.map((sub) => (
                  <li key={sub.key} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">
                      {sub.maxScore}점
                    </span>
                    <div>
                      <p className="text-xs font-medium text-zinc-700">{sub.name}</p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{sub.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400 text-center pt-1">
        총 {totalMax}점 기준 + 배포 URL 제출 시 보너스 최대 10점
      </p>
    </div>
  );
}
