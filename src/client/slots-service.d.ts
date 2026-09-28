/**
 * The `slots` service the client runtime injects (`export const inject = ['slots']`).
 *
 * WHY THIS FILE EXISTS
 * `@deepseek-ai/dsh-client-ui-slots` types the slot CORE (`SlotCore.register`, the
 * `SlotMap` vocabulary, the composed-props contract) but nothing augments cordis's
 * `Context` with the SERVICE itself: the `ClientContext` that used to carry it lived
 * in `@deepseek-ai/dsh-client-runtime/client`, which DSH 0.1.5 retired — and this
 * plugin deliberately stopped importing it (see tsdown.config.ts). The runtime still
 * installs `ctx.slots`, so a plugin in that position has to say what it relies on.
 *
 * WHY NOT `SlotCore`'s own types: `SlotCore.register` is generic over
 * `keyof SlotMap`, and `SlotMap` is an EMPTY interface that the slot-OWNER packages
 * fill in by declaration merging. This plugin imports none of those owners, so
 * `keyof SlotMap` is `never` here and the real signature would reject every call.
 * The surface below is therefore deliberately the two METHODS the shell calls, with
 * the slot name as a plain string — exactly the contract the runtime honours, no more.
 *
 * Keep it minimal: if a future DSH release ships a typed client context again, delete
 * this file and import that type instead.
 */
import type { ReactNode } from 'react'

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: {
      /**
       * Run `setup` once the named slot has been declared, and dispose whatever it
       * returns when this fiber ends. Returns the disposer `ctx.effect` wants.
       */
      inject(slot: string, setup: () => (() => void) | void): () => void
      /**
       * Contribute a component to a declared slot.
       * @param options - `id` is required for list slots; `order` breaks priority ties;
       *   `label` is a thunk read at render time (locale switches re-read it).
       * @param component - the slot body. Typed `unknown` on purpose: the real
       *   constraint is `SlotComponent<ComposedProps<…>>`, which cannot be expressed
       *   without the owner packages' `SlotMap` merges.
       */
      register(
        options: { name: string; id?: string; order?: number; label?: () => string },
        component: unknown,
      ): () => void
    }
  }
}

/** Re-exported so the shell's slot bodies can name their return type without
 *  importing React everywhere. */
export type SlotBody = () => ReactNode
