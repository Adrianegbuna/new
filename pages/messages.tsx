import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { openLiveChatPopup } from '@/lib/liveChat'

export default function Messages() {
  const router = useRouter()

  useEffect(() => {
    openLiveChatPopup()
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Head>
        <title>Opening Live Chat...</title>
      </Head>
      <p className="text-sm text-gray-500">Opening live chat...</p>
    </div>
  )
}
