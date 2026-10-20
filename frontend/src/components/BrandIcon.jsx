import React from 'react';

export function BrandIcon({ className = 'w-11 h-11' }) {
  return (
    <span className={`app-icon-frame ${className}`}>
      <img
        src="/assets/chemsha-bongo-logo.png"
        alt="Chemsha Bongo"
        className="app-icon-image"
        draggable="false"
      />
    </span>
  );
}
