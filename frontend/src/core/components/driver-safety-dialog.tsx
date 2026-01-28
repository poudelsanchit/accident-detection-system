"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, CheckCircle, X } from "lucide-react"
import { Button } from "@/core/components/ui/button"
import { Card } from "@/core/components/ui/card"
import { useEffect, useState } from "react"

interface DriverSafetyDialogProps {
  isVisible: boolean
  accidentId: string
  onConfirmSafe: (accidentId: string) => void
  onClose: () => void
}

export function DriverSafetyDialog({
  isVisible,
  accidentId,
  onConfirmSafe,
  onClose,
}: DriverSafetyDialogProps) {
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (isVisible) {
      setCountdown(10)
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isVisible])

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.9,
              y: 20,
              transition: { duration: 0.2 }
            }}
            transition={{ 
              duration: 0.3, 
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[440px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="relative overflow-hidden border-2 border-orange-500 bg-white dark:bg-gray-900 shadow-2xl">
              {/* Animated glow effect */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 via-red-500/30 to-orange-500/30 rounded-lg blur-xl"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Content */}
              <div className="relative bg-white dark:bg-gray-900 rounded-lg p-6">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                    }}
                    className="flex-shrink-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7 text-white" />
                    </div>
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Accident Detected
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Are you safe?
                    </p>
                  </div>
                  {/* Countdown badge */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center border-2 border-red-500">
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        {countdown}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Our system has detected a potential accident. Emergency services and your organization have been notified.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-2 font-medium">
                    If you are safe and this was a false alarm, please confirm below.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => onConfirmSafe(accidentId)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Yes, I'm Safe
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 border-2 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 font-semibold py-6 text-base"
                  >
                    <X className="w-5 h-5 mr-2" />
                    No, Need Help
                  </Button>
                </div>

                {/* Footer note */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                  {countdown > 0 
                    ? `This dialog will close automatically in ${countdown} seconds`
                    : "If you need help, emergency services are on their way"
                  }
                </p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
