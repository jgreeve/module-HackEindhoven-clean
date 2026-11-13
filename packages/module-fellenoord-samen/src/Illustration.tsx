// SPDX-License-Identifier: MIT
import { nl } from "./copy";
import type { Category } from "./copy";
export function Illustration({ category, plan }: { category: Category; plan: boolean }) {
  return <figure className="fs-illustration"><svg viewBox="0 0 480 220" role="img" aria-label={`${plan ? nl.plan : nl.scene} — ${nl.categories[category]}`}>
    <rect width="480" height="220" fill="#e9f1ed" />
    {plan ? <>
      <path d="M0 170 L480 70 M0 190 L480 90" stroke="#fffdf6" strokeWidth="16" />
      <path d="M360 0 Q300 110 430 220" stroke="#9ac9d1" fill="none" strokeWidth="38" />
      {[40, 145, 250].map((x, i) => <g key={x}><rect x={x} y={30 + i * 4} width="68" height="58" rx="4" fill="#c9b49a" stroke="#74877d" strokeWidth="2" /><circle cx={x + 28} cy="120" r="16" fill="#8ba88c" /></g>)}
      <path d="M15 204 H465" stroke="#64786d" strokeWidth="6" strokeDasharray="18 8" />
    </> : <>
      <circle cx="400" cy="40" r="22" fill="#f6d895" /><path d="M0 145 Q140 115 270 152 T480 138 V220 H0Z" fill="#c2d5b6" />
      {category !== "groen" && [55, 145, 240].map((x, i) => <g key={x}><rect x={x} y={90 - i * 23} width="70" height={85 + i * 23} fill={i % 2 ? "#bcaa91" : "#e0cbb0"} /><path d={`M${x + 12} ${108 - i * 23}h45 M${x + 12} ${126 - i * 23}h45 M${x + 12} ${144 - i * 23}h45`} stroke="#7d8c8c" strokeWidth="8" /></g>)}
      <path d="M-20 213 Q220 140 500 195" stroke={category === "groen" ? "#8bbfc9" : "#f7f2e7"} strokeWidth="35" fill="none" />
      {[28, 338, 440].map((x, i) => <g key={x}><path d={`M${x} 125v55`} stroke="#7d7964" strokeWidth="5" /><circle cx={x} cy={112 + i * 5} r="25" fill={i % 2 ? "#729779" : "#94ae82"} /></g>)}
      <path d="M355 179h36m-31 0v12m26-12v12" stroke="#745e49" strokeWidth="5" /><circle cx="213" cy="172" r="5" fill="#486d68" /><path d="M213 177v17m0-12-8 5m8 7-5 12m5-12 7 12" stroke="#486d68" strokeWidth="4" />
    </>}
  </svg><figcaption>{nl.illustration}</figcaption></figure>;
}
