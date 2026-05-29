import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface MannerStarsProps {
  rating: number; // 0.5 ~ 5.0 사이의 별점 (내부 신뢰도 점수의 1/2)
  size?: number;
  showText?: boolean;
}

export default function MannerStars({ rating, size = 16, showText = true }: MannerStarsProps) {
  const stars = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(stars);
  const hasHalf = stars - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {/* 가득 찬 별 */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={size}
            color="#f59e0b"
            fill="#f59e0b"
            style={styles.starSpacing}
          />
        ))}

        {/* 반쪽짜리 별 */}
        {hasHalf && (
          <View key="half" style={{ width: size, height: size, position: 'relative', marginRight: 2 }}>
            <Star size={size} color="#e5e7eb" fill="#e5e7eb" />
            <View style={{ position: 'absolute', top: 0, left: 0, width: size / 2, height: size, overflow: 'hidden' }}>
              <Star size={size} color="#f59e0b" fill="#f59e0b" />
            </View>
          </View>
        )}

        {/* 빈 별 */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={size}
            color="#e5e7eb"
            fill="#e5e7eb"
            style={styles.starSpacing}
          />
        ))}
      </View>

      {showText && (
        <Text style={styles.text}>
          {stars.toFixed(1)}{' '}
          <Text style={styles.subtext}>/ 5.0</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starSpacing: {
    marginRight: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },
  subtext: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#9ca3af',
  },
});
