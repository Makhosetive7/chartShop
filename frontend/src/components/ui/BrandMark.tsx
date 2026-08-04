import styled from 'styled-components';

const Mark = styled.span<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 0;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ $size }) => Math.max(10, Math.round($size * 0.38))}px;
  letter-spacing: -0.02em;
  line-height: 1;
  color: white;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.coral},
    ${({ theme }) => theme.colors.maroon}
  );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  user-select: none;
`;

type BrandMarkProps = {
  size?: number;
  className?: string;
};

/** ChartShop logo tile — centered “CS” monogram. */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <Mark $size={size} className={className} aria-hidden>
      CS
    </Mark>
  );
}
