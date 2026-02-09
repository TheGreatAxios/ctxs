'use client';

export function SkaleBadge() {
  return (
    <a
      href="https://skale.space"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 bg-white border-3 border-black brutalist-shadow hover:translate-y-1 hover:shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-2 transition-all px-4 py-3 rounded-xl group"
      title="Powered by SKALE"
    >
      {/* SKALE Logo from web3icons */}
      <img
        src="https://web3icons.io/tokens/SKL/icon?177aba498ff5c305"
        alt="SKALE Logo"
        width="32"
        height="32"
        className="flex-shrink-0"
      />

      {/* Text */}
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider leading-tight">
          Only on
        </span>
        <span className="text-base font-black text-stone-900 uppercase tracking-wider group-hover:text-primary transition-colors">
          SKALE
        </span>
      </div>

      {/* External Link Icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-stone-400 group-hover:text-primary transition-colors flex-shrink-0"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="9" x2="21" y2="20" />
      </svg>
    </a>
  );
}
