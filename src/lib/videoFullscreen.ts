type FullscreenVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitRequestFullscreen?: () => Promise<void> | void
  webkitDisplayingFullscreen?: boolean
}

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
}

export const openVideoFullscreen = (video: HTMLVideoElement) => {
  const element = video as FullscreenVideoElement
  const doc = document as WebkitDocument

  const previousState = {
    controls: element.controls,
    muted: element.muted,
    loop: element.loop,
  }

  const restorePreviewState = () => {
    element.controls = previousState.controls
    element.muted = previousState.muted
    element.loop = previousState.loop
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener)
  }

  const onFullscreenChange = () => {
    const inFullscreen = Boolean(document.fullscreenElement || doc.webkitFullscreenElement || element.webkitDisplayingFullscreen)
    if (!inFullscreen) {
      restorePreviewState()
    }
  }

  element.controls = true
  element.muted = false
  element.loop = false

  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener)
  element.addEventListener('webkitendfullscreen', restorePreviewState, { once: true } as AddEventListenerOptions)

  const playPromise = element.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Autoplay with sound can be blocked by browser policy.
    })
  }

  if (element.requestFullscreen) {
    element.requestFullscreen().catch(() => {
      // Ignore browser restriction errors.
    })
    return
  }

  if (element.webkitEnterFullscreen) {
    try {
      element.webkitEnterFullscreen()
      return
    } catch {
      // Continue to other fallback.
    }
  }

  if (element.webkitRequestFullscreen) {
    try {
      element.webkitRequestFullscreen()
      return
    } catch {
      // Ignore unsupported fallback.
    }
  }

  // If fullscreen is unavailable, keep controls enabled for inline playback.
}
