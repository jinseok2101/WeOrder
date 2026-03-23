import { ExternalLink } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

interface Props {
  nickname: string;
  amount: number;
  className?: string;
}

export default function PayLinkButton({ nickname, amount, className }: Props) {
  const tossUrl = `https://toss.me/${encodeURIComponent(nickname)}/${amount}`;
  const kakaoUrl = `https://qr.kakaopay.com/Ej8uSc6n5`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-xs text-gray-500 text-center">
        방장 닉네임: <strong>{nickname}</strong> · {formatCurrency(amount)} 송금
      </p>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={tossUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-[#0064FF] text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <ExternalLink size={14} />
          토스로 보내기
        </a>
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-[#FEE500] text-[#3C1E1E] rounded-xl py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <ExternalLink size={14} />
          카카오페이
        </a>
      </div>
    </div>
  );
}
