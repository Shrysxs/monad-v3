import React from 'react';
import { TuxLogo } from '../common/TuxLogo';

interface PenguinIconProps {
  className?: string;
  size?: number;
}

/**
 * Replaced with authentic Linux Tux mascot logo to ensure consistent branding throughout.
 */
export function PenguinIcon({ size = 22, className = '' }: PenguinIconProps) {
  return <TuxLogo size={size} className={className} />;
}

export default PenguinIcon;
