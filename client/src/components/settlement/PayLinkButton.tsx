import { ExternalLink, Copy } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { useState } from 'react';

interface Props {
  host: {
    nickname: string;
    tossId?: string | null;
    kakaoPayLink?: string | null;
    bankAccount?: string | null;
  };
  amount: number;
  className?: string;
}

export default function PayLinkButton({ host, amount, className }: Props) {
  const [copied, setCopied] = useState(false);
  const kakaoUrl = host.kakaoPayLink || '';

  const handleCopyAccount = () => {
    if (host.bankAccount) {
      navigator.clipboard.writeText(host.bankAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTossOpen = () => {
    if (host.bankAccount) {
      navigator.clipboard.writeText(host.bankAccount).then(() => {
        window.location.href = 'supertoss://send';
      }).catch(() => {
        window.location.href = 'supertoss://send';
      });
    } else {
      window.location.href = 'supertoss://send';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-xs text-gray-500 text-center">
        방장 닉네임: <strong>{host.nickname}</strong> · {formatCurrency(amount)} 송금
      </p>

      {host.bankAccount && (
        <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{host.bankAccount}</span>
          <button 
            onClick={handleCopyAccount}
            className="text-xs flex items-center gap-1 text-primary-600 bg-primary-50 px-2 py-1.5 rounded-lg hover:bg-primary-100 transition-colors flex-shrink-0"
          >
            <Copy size={12} />
            {copied ? '복사됨' : '계좌복사'}
          </button>
        </div>
      )}

      {(host.bankAccount || host.kakaoPayLink) && (
        <div className={cn('grid gap-2', (host.bankAccount && host.kakaoPayLink) ? 'grid-cols-2' : 'grid-cols-1')}>
          {host.bankAccount && (
            <button
              onClick={handleTossOpen}
              className="flex items-center justify-center gap-1.5 bg-[#0064FF] text-white rounded-xl py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={14} />
              토스 열기
            </button>
          )}
          {host.kakaoPayLink && (
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-[#FEE500] text-[#3C1E1E] rounded-xl py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={14} />
              카카오페이
            </a>
          )}
        </div>
      )}

      {!host.kakaoPayLink && !host.bankAccount && (
        <p className="text-xs text-red-500 text-center bg-red-50 py-2 rounded-xl mt-1 border border-red-100">
          방장이 아직 송금 정보를 등록하지 않았습니다. 채팅으로 문의해주세요!
        </p>
      )}
    </div>
  );
}
