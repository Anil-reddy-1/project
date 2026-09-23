/**
 * Animation Utilities
 * Reusable animation configurations and helpers for consistent motion design
 */

/**
 * Standard animation durations (in milliseconds)
 */
export const DURATIONS = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
} as const;

/**
 * Standard easing functions for Framer Motion
 * Using array notation for cubic-bezier curves
 */
export const EASINGS = {
  easeIn: [0.4, 0, 1, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

/**
 * Framer Motion variants for common animations
 */

// Fade in/out
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Slide up from bottom
export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

// Slide down from top
export const slideDownVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Slide in from left
export const slideLeftVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Slide in from right
export const slideRightVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Scale (grow/shrink)
export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Scale with spring
export const scaleSpringVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.8 },
};

// List stagger animation
export const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// Card flip animation
export const flipVariants = {
  hidden: { opacity: 0, rotateY: -90 },
  visible: { 
    opacity: 1, 
    rotateY: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  exit: { opacity: 0, rotateY: 90 },
};

// Collapse/Expand (for accordions)
export const collapseVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { 
    height: 'auto', 
    opacity: 1,
    transition: {
      height: {
        duration: 0.3,
      },
      opacity: {
        duration: 0.2,
        delay: 0.1,
      },
    },
  },
};

/**
 * Standard transition configurations
 */
export const transitions = {
  fast: {
    duration: DURATIONS.fast / 1000,
    ease: EASINGS.easeInOut,
  },
  normal: {
    duration: DURATIONS.normal / 1000,
    ease: EASINGS.easeInOut,
  },
  slow: {
    duration: DURATIONS.slow / 1000,
    ease: EASINGS.easeInOut,
  },
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  },
  softSpring: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
  },
};

/**
 * CSS class-based animations (for non-Framer Motion components)
 */
export const cssAnimations = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  scaleIn: 'animate-scale-in',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
};

/**
 * Utility function to create stagger delay
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

/**
 * Utility function to create spring animation config
 */
export function createSpringConfig(stiffness: number = 300, damping: number = 25) {
  return {
    type: 'spring' as const,
    stiffness,
    damping,
  };
}

/**
 * Utility function for enter/exit animations with custom timing
 */
export function createEnterExitVariants(
  enterFrom: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'center',
  distance: number = 20
) {
  const getTransform = () => {
    switch (enterFrom) {
      case 'top':
        return { y: -distance };
      case 'bottom':
        return { y: distance };
      case 'left':
        return { x: -distance };
      case 'right':
        return { x: distance };
      default:
        return { scale: 0.95 };
    }
  };

  return {
    hidden: { opacity: 0, ...getTransform() },
    visible: { opacity: 1, y: 0, x: 0, scale: 1 },
    exit: { opacity: 0, ...getTransform() },
  };
}

/**
 * Hover and tap scale effects
 */
export const interactionVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const iconButtonVariants = {
  hover: { scale: 1.1, rotate: 5 },
  tap: { scale: 0.9, rotate: 0 },
};

/**
 * Loading spinner variants
 */
export const spinnerVariants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Badge animation (for cart count, notifications)
 */
export const badgeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: createSpringConfig(400, 15),
  },
  exit: { scale: 0, opacity: 0 },
  update: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
    },
  },
};

/**
 * Toast notification variants
 */
export const toastVariants = {
  hidden: { opacity: 0, y: -50, scale: 0.3 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: createSpringConfig(400, 20),
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Page transition variants
 */
export const pageVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      when: 'beforeChildren',
    },
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Modal/Dialog variants
 */
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
};

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Skeleton loading animation
 */
export const skeletonVariants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
