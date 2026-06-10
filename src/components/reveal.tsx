"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useReveal } from "@/hooks/use-reveal"

type AnimationVariant = "fade-in" | "fade-up" | "scale-in" | "slide-right"

const animationClasses: Record<AnimationVariant, string> = {
  "fade-in": "animate-fade-in",
  "fade-up": "animate-fade-up",
  "scale-in": "animate-scale-in",
  "slide-right": "animate-slide-right",
}

interface RevealProps {
  children: ReactNode
  variant?: AnimationVariant
  delay?: number
  className?: string
  threshold?: number
  as?: "div" | "span" | "section"
}

export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  className,
  threshold = 0.1,
  as: Tag = "div",
}: RevealProps) {
  const { ref, isVisible } = useReveal({ threshold })

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-all",
        isVisible
          ? `${animationClasses[variant]}`
          : "opacity-0 translate-y-4",
        className
      )}
      style={{
        transitionDelay: `${delay}ms`,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  )
}

export function Stagger({
  children,
  className,
  staggerDelay = 100,
  variant = "fade-up",
  threshold = 0.05,
}: {
  children: ReactNode[]
  className?: string
  staggerDelay?: number
  variant?: AnimationVariant
  threshold?: number
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal
          key={i}
          variant={variant}
          delay={i * staggerDelay}
          threshold={threshold}
        >
          {child}
        </Reveal>
      ))}
    </div>
  )
}
