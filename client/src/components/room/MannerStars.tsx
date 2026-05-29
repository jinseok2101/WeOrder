import { Star } from 'lucide-react';

interface MannerStarsProps {
  rating: number; // 0.5 ~ 5.0 사이의 별점 (내부 신뢰도 점수의 1/2)
  size?: number;
  showText?: boolean;
}

export default function MannerStars({ rating, size = 16, showText = true }: MannerStarsProps) {
  // 별점 유효값 보정 (0 ~ 5 범위)
  const stars = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(stars);
  const hasHalf = stars - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {/* 가득 찬 별 */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={size}
            className="fill-amber-400 text-amber-400"
          />
        ))}

        {/* 반쪽짜리 별 */}
        {hasHalf && (
          <div className="relative inline-block text-amber-400" style={{ width: size, height: size }}>
            <Star size={size} className="text-gray-200 fill-gray-200" />
            <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
              <Star size={size} className="fill-amber-400 text-amber-400" />
            </div>
          </div>
        )}

        {/* 빈 별 */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={size}
            className="text-gray-200 fill-gray-200"
          />
        ))}
      </div>

      {showText && (
        <span className="text-sm font-bold text-gray-700">
          {stars.toFixed(1)} <span className="text-xs text-gray-400 font-normal">/ 5.0</span>
        </span>
      )}
    </div>
  );
}
