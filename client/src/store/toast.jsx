import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const show = useCallback((text, tone = 'success') => {
    const id = Date.now()
    setToast({ id, text, tone })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), tone === 'error' ? 5000 : 3000)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div role="status" className="animate-fade-in fixed bottom-6 left-1/2 z-[60] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm text-bg shadow-lg">
          {toast.tone === 'error' ? <XCircle className="size-4 shrink-0 text-danger" /> : <CheckCircle2 className="size-4 shrink-0 text-success" />}
          {toast.text}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
