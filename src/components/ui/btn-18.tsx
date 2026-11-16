/*
 * Adapted from the Visibility morph in Amicro.
 * https://github.com/Subhan-code/Amicro--Micro-transitions-
 *
 * MIT License
 * Copyright (c) 2026 SYED  SUBHAN UDDIN
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Eye, EyeOff } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

type VisibilityButtonProps = {
  theme?: 'dark' | 'light'
  visible: boolean
  onVisibilityChange: (visible: boolean) => void
  controls: string
  fieldLabel: string
  disabled?: boolean
}

export function VisibilityButton({
  theme = 'dark', visible, onVisibilityChange, controls, fieldLabel, disabled,
}: VisibilityButtonProps) {
  const reduceMotion = useReducedMotion()
  const action = `${visible ? 'Masquer' : 'Afficher'} — ${fieldLabel}`
  const Icon = visible ? EyeOff : Eye
  const folded = { scale: 0.5, opacity: 0 }

  return <button
    type="button"
    className="visibility-button"
    data-theme={theme}
    aria-label={action}
    aria-controls={controls}
    title={action}
    disabled={disabled}
    onClick={() => onVisibilityChange(!visible)}
  >
    <span className="visibility-icon" aria-hidden="true">
      {reduceMotion ? <Icon size={16} /> : <AnimatePresence initial={false}>
        <motion.span
          key={String(visible)}
          initial={folded}
          animate={{ scale: 1, opacity: 1 }}
          exit={folded}
          transition={{ type: 'spring', stiffness: 600, damping: 28 }}
        >
          <Icon size={16} />
        </motion.span>
      </AnimatePresence>}
    </span>
  </button>
}
