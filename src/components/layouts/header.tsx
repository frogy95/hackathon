import Link from "next/link";
import { Trophy } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-zinc-900">
          <Trophy className="h-5 w-5 text-amber-500" />
          <span>해커톤 평가 시스템</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-900 transition-colors">
            홈
          </Link>
          <Link href="/admin" className="hover:text-zinc-900 transition-colors">
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}
