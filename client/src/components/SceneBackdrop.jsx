import React from 'react';
import housingImg from '../assets/landing/housing.svg';
import marketImg from '../assets/landing/market.svg';
import settleImg from '../assets/landing/settle.svg';
import './SceneBackdrop.css';

// The three landing scenes (room, desk, map) blended into one very quiet
// background, like on log in, here behind the marketplace. Purely decoration.
const SceneBackdrop = () => (
    <div className="scene-backdrop" aria-hidden="true">
        <img src={housingImg} alt="" />
        <img src={marketImg} alt="" />
        <img src={settleImg} alt="" />
    </div>
);

export default SceneBackdrop;
