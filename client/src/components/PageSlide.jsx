import React, { useState } from 'react';

// Pages slide in based on where they sit in the visitor's journey:
//   landing (0) → log in (1) → register (2) → landlord register (3) → email confirmation (4) → the app (10)
// Moving "forward" slides the new page in from the right, moving "back" from the left,
// so going home always feels like stepping back. Pages at the same step just appear.
let lastStep = null;

function pickDirection(step) {
    const previous = lastStep;
    lastStep = step;
    if (previous === null || previous === step) return '';
    return step > previous ? 'page-slide--from-right' : 'page-slide--from-left';
}

const PageSlide = ({ step, children }) => {
    // Decided once, when the page mounts
    const [direction] = useState(() => pickDirection(step));
    return <div className={`page-slide ${direction}`}>{children}</div>;
};

export default PageSlide;
