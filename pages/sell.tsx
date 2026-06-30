import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Sell() {
  const router = useRouter()
  useEffect(() => { router.push('/register?type=vendor') }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-xl text-gray-900 font-bold">Redirecting to vendor registration...</p>
      </div>
    </div>
  )
}



