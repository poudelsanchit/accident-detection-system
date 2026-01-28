"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, MapPin, X, Clock, Navigation } from "lucide-react"
import { Button } from "@/core/components/ui/button"
import { Card } from "@/core/components/ui/card"

interface AccidentAlertProps {
  isVisible: boolean
  vehicleId?: string
  vehicleName?: string
  location?: string
  timestamp?: Date
  onViewLocation?: () => void
  onAcknowledge?: () => void
}

export function AccidentAlert({
  isVisible,
  vehicleId,
  vehicleName = "Unknown Vehicle",
  location,
  timestamp,
  onViewLocation,
  onAcknowledge,
}: AccidentAlertProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -40 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.85,
            y: -40,
            transition: { duration: 0.2, ease: "easeIn" }
          }}
          transition={{ 
            duration: 0.5, 
            ease: [0.16, 1, 0.3, 1],
            type: "spring",
            damping: 25,
            stiffness: 300
          }}
          className="fixed top-6 right-6 z-50 w-[440px] max-w-[calc(100vw-3rem)]"
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 shadow-2xl backdrop-blur-sm">
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                background: "linear-gradient(135deg, #ef4444, #f97316, #ef4444)",
                backgroundSize: "200% 200%",
                padding: "2px",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />

            {/* Animated glow effect */}
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 rounded-lg blur-xl"
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
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <motion.div
                    animate={{
                      rotate: [0, -8, 8, -8, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                    }}
                    className="flex-shrink-0 mt-0.5"
                  >
                    <div className="relative">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <AlertTriangle className="h-7 w-7 text-white" strokeWidth={2.5} />
                      </div>
                      {/* Pulsing ring */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-red-500"
                        animate={{
                          scale: [1, 1.3, 1.3],
                          opacity: [0.8, 0, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeOut"
                        }}
                      />
                    </div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent mb-1">
                      🚨 Accident Detected
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Immediate attention required
                    </p>
                  </div>
                </div>
                
                {onAcknowledge && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2 -mt-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                    onClick={onAcknowledge}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
              </div>

              {/* Alert message */}
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-900 dark:text-red-200">
                  Sudden abnormal vehicle movement detected
                </p>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-5">
                {vehicleName && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🚗</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                        Vehicle
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {vehicleName}
                      </p>
                      {vehicleId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          ID: {vehicleId}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {location && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                        Location
                      </p>
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                        {location}
                      </p>
                    </div>
                  </div>
                )}

                {timestamp && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-3">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {new Date(timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {onViewLocation && (
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/30 font-semibold"
                    onClick={onViewLocation}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    View Location
                  </Button>
                )}
                {onAcknowledge && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold"
                    onClick={onAcknowledge}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom animated accent */}
            <motion.div
              className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: "200% 100%"
              }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
