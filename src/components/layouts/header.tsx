import Link from "next/link";
import { Trophy } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <span>해커톤 평가 시스템</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">
            홈
          </Link>
          <Link href="/admin" className="hover:text-white transition-colors">
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}
