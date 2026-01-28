# BiteSwap Design System

## Overview

The BiteSwap DEX frontend features a **neo-brutalist, light, fun, and clean aesthetic** that combines bold visual elements with modern usability. This design system emphasizes high contrast, distinctive shadows, and playful interactions while maintaining clarity and accessibility.

## Design Philosophy

- **Neo-brutalist Style**: Bold borders (3px solid), hard shadows (no blur), raw aesthetic
- **Light Mode Focus**: Warm whites, cream backgrounds for a clean, airy feel
- **Fun & Playful**: Vibrant accent colors, interesting hover states, micro-interactions
- **Enhanced Uniformity**: Consistent spacing, border weights, shadows across all components
- **Accessibility First**: High contrast ratios, clear typography, semantic HTML

## Color Palette

### Base Colors

```css
/* Backgrounds */
--background: #FAFAF9;  /* Warm off-white */
--card: #FFFFFF;        /* Pure white */
--muted: #F5F5F4;       /* Light gray */

/* Text & Borders */
--foreground: #2A2420;  /* Near black for text */
--border: #2A2420;      /* Same for borders */
--muted-foreground: #6B6560;  /* Medium gray for secondary text */

/* Primary Colors (Vibrant & Electric) */
--primary: #00B4D8;     /* Electric blue */
--primary-foreground: #FFFFFF;

--secondary: #22C55E;   /* Lime green */
--secondary-foreground: #FFFFFF;

--accent: #FF6B9D;      /* Coral pink */
--accent-foreground: #FFFFFF;

/* Semantic Colors */
--success: #22C55E;     /* Green (same as secondary) */
--warning: #FBBF24;     /* Warm yellow */
--error: #FF6B9D;       /* Pink/coral (same as accent) */
--info: #00B4D8;        /* Blue (same as primary) */
```

### Color Usage Guidelines

- **Primary**: Main CTAs, important actions, links
- **Secondary**: Success states, confirmations, alternative actions
- **Accent**: Error states, warnings, highlights
- **Warning**: Cautions, pending states, important notices
- **Muted**: Disabled states, backgrounds, subtle containers

## Typography

### Font Stack

```css
font-family: system-ui, -apple-system, sans-serif;
```

### Type Scale

- **Body Text**: 16px (base), font-weight: 400-500
- **Small Text**: 14px, font-weight: 400-500
- **Labels**: 12px, font-weight: 700 (bold), uppercase, tracking-wide
- **Headings**: 24px+, font-weight: 700-800 (extrabold), tight tracking
- **Buttons**: 16-18px, font-weight: 700 (bold), uppercase

### Typography Hierarchy

```tsx
// Page Heading
<h1 className="text-3xl font-extrabold uppercase tracking-tight">
  Swap Tokens
</h1>

// Section Heading
<h2 className="text-xl font-extrabold uppercase tracking-wide">
  Liquidity Pools
</h2>

// Label
<label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
  From Token
</label>

// Body Text
<p className="text-sm font-medium text-foreground">
  Your transaction was successful
</p>
```

## Borders & Shadows

### Border System

```css
/* Standard border - use for most elements */
border-3 border-solid border-border

/* Thinner border - use for subtle elements */
border-2 border-solid border-border

/* Bottom border - use for dividers */
border-b-3 border-solid border-border
```

### Shadow System

```css
/* Standard brutalist shadow */
box-shadow: 4px 4px 0px 0px hsl(var(--border));

/* Large shadow for cards/modals */
box-shadow: 8px 8px 0px 0px hsl(var(--border));

/* Small shadow for badges/tags */
box-shadow: 2px 2px 0px 0px currentColor;

/* Colored shadow for emphasis */
box-shadow: 4px 4px 0px 0px hsl(var(--primary));
box-shadow: 4px 4px 0px 0px hsl(var(--error));
```

### Shadow Animation

Shadows animate on hover/active to create tactile feedback:

- **Hover**: Shadow reduces, element translates slightly (2px)
- **Active**: Shadow disappears, element translates fully (4px)

```css
/* Hover state */
box-shadow: 2px 2px 0px 0px hsl(var(--border));
transform: translate(2px, 2px);

/* Active state */
box-shadow: 0px 0px 0px 0px hsl(var(--border));
transform: translate(4px, 4px);
```

## Spacing System

### Scale (4px base unit)

- **xs**: 4px (0.25rem)
- **sm**: 8px (0.5rem)
- **md**: 16px (1rem)
- **lg**: 24px (1.5rem)
- **xl**: 32px (2rem)
- **2xl**: 48px (3rem)

### Usage Examples

```tsx
// Component padding
<div className="p-4">  {/* 16px padding */}

// Gap between elements
<div className="gap-6">  {/* 24px gap */}

// Margin
<div className="mb-4">  {/* 16px bottom margin */}
```

## Border Radius

```css
--radius-sm: 0.25rem;  /* 4px - sharp corners */
--radius-md: 0.5rem;   /* 8px - medium roundness */
--radius-lg: 0.75rem;  /* 12px - more rounded */
```

### Guidelines

- **Cards/Containers**: `rounded-lg` (12px)
- **Buttons/Inputs**: `rounded-md` (8px)
- **Badges/Tags**: `rounded-sm` or `rounded-md` (4-8px)
- **Special**: `rounded-full` for icon buttons, swap direction button

## Component Patterns

### Buttons

```tsx
// Primary CTA
<Button variant="primary" size="lg">
  Swap Tokens
</Button>

// Secondary action
<Button variant="secondary" size="md">
  Approve
</Button>

// Destructive action
<Button variant="error" size="sm">
  Cancel
</Button>

// Outline style
<Button variant="outline" size="md">
  Learn More
</Button>

// With loading state
<Button isLoading={true} size="lg">
  Processing...
</Button>
```

**Button Features**:
- 3px solid border
- 4px offset hard shadow
- Bold uppercase text
- Shadow animates on hover/active
- Loading spinner replaces content when `isLoading={true}`

### Inputs

```tsx
// Standard input
<Input
  label="Amount"
  placeholder="0.0"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
/>

// With error
<Input
  label="Amount"
  value={amount}
  error="Amount must be greater than 0"
/>

// With right element (icon, text)
<Input
  placeholder="Enter amount"
  rightElement={<span className="font-bold">ETH</span>}
/>
```

**Input Features**:
- 3px solid border
- 4px offset hard shadow
- Bold uppercase labels with wide tracking
- Error state shows red border and shadow
- Focus state shows primary color border and shadow

### Badges

```tsx
// Status badges
<Badge variant="open">Open</Badge>
<Badge variant="filled">Filled</Badge>
<Badge variant="cancelled">Cancelled</Badge>
<Badge variant="pending">Pending</Badge>

// Color badges
<Badge variant="primary">New</Badge>
<Badge variant="secondary">Active</Badge>
<Badge variant="accent">Hot</Badge>
```

**Badge Features**:
- 2px solid border
- 2px offset shadow matching text color
- Bold uppercase text with wide tracking
- Compact size (12px font)

### Cards

```tsx
<div className="brutalist-card p-6">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```

**Card Features**:
- 3px solid border
- 4px offset shadow
- White background
- Rounded corners (12px)
- Consistent padding

### Dialogs/Modals

```tsx
<Dialog isOpen={isOpen} onClose={handleClose} title="Confirm Swap">
  <p>Are you sure you want to swap?</p>
  <Button onClick={handleConfirm}>Confirm</Button>
</Dialog>
```

**Dialog Features**:
- 8px offset shadow (larger for emphasis)
- 3px solid border
- Muted background header with bottom border
- Close button with hover effects
- Backdrop blur

## Interactive States

### Hover States

- Buttons: Shadow reduces, element translates 2px
- Links: Animated underline appears
- Cards: Subtle lift effect
- Inputs: Border color changes to primary

### Active States

- Buttons: Shadow disappears, element translates 4px
- All interactive elements provide tactile feedback

### Focus States

- All focusable elements show primary color shadow
- Outline removed in favor of shadow indication
- High visibility for keyboard navigation

### Disabled States

- Opacity reduced to 50%
- All shadows removed
- `cursor: not-allowed`
- No hover/active effects

## Layout Patterns

### Container

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Grid System

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>

// Flex layout
<div className="flex items-center justify-between gap-4">
  {/* Content */}
</div>
```

### Spacing Patterns

```tsx
// Section spacing
<section className="space-y-6">

// Card content
<div className="flex flex-col gap-4">

// Inline elements
<div className="flex items-center gap-2">
```

## Animations

### Loading Spinner

```tsx
<div className="brutalist-spinner" />
```

Features:
- 3px solid border
- Top border colored with primary
- Smooth rotation animation

### Micro-interactions

- **Button press**: Shadow + translate animation
- **Link hover**: Underline slides in from right
- **Card hover**: Subtle lift with shadow change
- **Input focus**: Border color transitions to primary

### Utility Animations

```tsx
// Bounce effect
<div className="brutalist-bounce">

// Shake effect (error)
<div className="brutalist-shake">
```

## Accessibility

### Contrast Ratios

- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements have enhanced contrast
- Error/warning states use high contrast combinations

### Semantic HTML

- Use proper heading hierarchy (h1-h6)
- Button elements for actions, anchor tags for links
- Labels for all form inputs
- ARIA labels for icon-only buttons

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus indicators are highly visible
- Logical tab order maintained
- Escape key closes modals

### Screen Reader Support

- Meaningful alt text for images
- ARIA live regions for dynamic content
- Semantic element usage
- Clear error messaging

## Utility Classes

### Text Styles

```tsx
// Bold text
<span className="font-bold">

// Uppercase with tracking
<span className="uppercase tracking-wide">

// Truncate text
<span className="truncate">
```

### Visual Effects

```tsx
// Brutalist shadow
<div className="brutalist-shadow">

// Brutalist border
<div className="brutalist-border">

// Brutalist card
<div className="brutalist-card">

// Pattern background
<div className="pattern-bg">
```

### Status Indicators

```tsx
// Status dots
<span className="status-dot online">
<span className="status-dot offline">
<span className="status-dot busy">
```

## Best Practices

### Do's

- Use bold weights for headings and labels (700-800)
- Apply uppercase and wide tracking to labels
- Use 3px borders for most elements
- Include hard shadows on interactive elements
- Maintain consistent spacing (4px base unit)
- Use semantic colors appropriately
- Ensure high contrast for text
- Add hover/active states to all interactive elements
- Use proper semantic HTML

### Don'ts

- Don't use thin borders (less than 2px)
- Don't use blurred shadows
- Don't mix dark mode with this light theme
- Don't use light gray text for important information
- Don't skip hover states on interactive elements
- Don't use inconsistent spacing
- Don't forget error states for forms
- Don't use low contrast color combinations

## Component Examples

### Swap Card

```tsx
<div className="brutalist-card p-6 space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between border-b-3 pb-4">
    <h2 className="text-2xl font-extrabold uppercase tracking-tight">
      Swap Tokens
    </h2>
  </div>

  {/* Content */}
  <div className="space-y-4">
    {/* Input sections */}
  </div>

  {/* Action */}
  <Button variant="primary" size="lg" className="w-full">
    Swap
  </Button>
</div>
```

### Token Display

```tsx
<div className="flex items-center gap-3 p-3 border-3 rounded-md bg-background">
  <div className="h-10 w-10 rounded-full bg-primary" />
  <div className="flex-1">
    <p className="font-bold text-sm uppercase">ETH</p>
    <p className="text-xs text-muted-foreground">Ethereum</p>
  </div>
  <p className="font-extrabold">1.234</p>
</div>
```

### Warning Banner

```tsx
<div className="bg-warning border-3 border-warning rounded-md p-4" style={{ boxShadow: '4px 4px 0px 0px hsl(var(--warning))' }}>
  <div className="flex items-start gap-3">
    <div className="rounded-md bg-warning-foreground p-1.5">
      <AlertCircle className="h-4 w-4 text-warning" />
    </div>
    <div>
      <p className="font-extrabold uppercase text-warning-foreground">
        Warning
      </p>
      <p className="text-sm font-medium text-warning-foreground/90">
        Warning message here
      </p>
    </div>
  </div>
</div>
```

## File Structure

```
biteswap-frontend/
├── app/
│   └── globals.css          # Design tokens, base styles
├── components/
│   ├── ui/
│   │   ├── Button.tsx       # Button component
│   │   ├── Input.tsx        # Input component
│   │   ├── Badge.tsx        # Badge component
│   │   └── Dialog.tsx       # Dialog component
│   └── dex/
│       ├── SwapForm.tsx     # Swap interface
│       ├── PoolList.tsx     # Pool listing
│       └── PoolDetail.tsx   # Pool details
└── DESIGN_SYSTEM.md         # This file
```

## Implementation Checklist

When creating new components:

- [ ] Use 3px solid borders
- [ ] Add hard shadows (4px offset)
- [ ] Include hover/active states
- [ ] Use bold weights for headings
- [ ] Apply uppercase + tracking to labels
- [ ] Ensure high contrast colors
- [ ] Test keyboard navigation
- [ ] Verify screen reader support
- [ ] Check responsive behavior
- [ ] Test error states

## Resources

- **Design Tokens**: Defined in `globals.css`
- **Component Library**: `/components/ui/`
- **Examples**: `/components/dex/`
- **Color Reference**: See Color Palette section above

---

**Version**: 1.0.0
**Last Updated**: 2025-01-27
**Maintained By**: BiteSwap Team
