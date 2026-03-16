import * as React from "react"

import { cn } from "@/lib/utils"

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...mergeProps(props, children.props as Record<string, unknown>),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref: ref ? composeRefs(ref, (children as any).ref) : (children as any).ref,
      } as Record<string, unknown>)
    }

    if (React.Children.count(children) > 1) {
      React.Children.only(null)
    }

    return null
  }
)
Slot.displayName = "Slot"

function mergeProps(slotProps: Record<string, unknown>, childProps: Record<string, unknown>) {
  const overrideProps = { ...childProps }

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]

    if (propName === "className") {
      overrideProps[propName] = cn(slotPropValue as string, childPropValue as string)
    } else if (propName === "style") {
      overrideProps[propName] = { ...(slotPropValue as object), ...(childPropValue as object) }
    } else if (/^on[A-Z]/.test(propName)) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          ;(childPropValue as Function)(...args)
          ;(slotPropValue as Function)(...args)
        }
      } else {
        overrideProps[propName] = slotPropValue || childPropValue
      }
    } else if (slotPropValue !== undefined) {
      overrideProps[propName] = slotPropValue
    }
  }

  // Add slot props that don't exist on child
  for (const propName in slotProps) {
    if (!(propName in childProps)) {
      overrideProps[propName] = slotProps[propName]
    }
  }

  return overrideProps
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(node)
      } else if (ref != null) {
        ;(ref as React.MutableRefObject<T>).current = node
      }
    })
  }
}

export { Slot }
