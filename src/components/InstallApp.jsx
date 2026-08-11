import { useEffect, useState } from 'react'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallApp() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const beforeInstall = (event) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const installedHandler = () => {
      setInstalled(true)
      setPromptEvent(null)
      setShowHelp(false)
    }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  if (installed) return null

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice?.outcome === 'accepted') setInstalled(true)
      setPromptEvent(null)
      return
    }
    setShowHelp(true)
  }

  return <div className="install-app">
    <button className="install-button" onClick={install}>⇩ Install</button>
    {showHelp && <div className="install-help">
      <strong>Install PolyShield on this phone</strong>
      <p><b>iPhone:</b> open the deployed HTTPS site in Safari → Share → Add to Home Screen → Add.</p>
      <p><b>Android:</b> open the site in Chrome → menu → Install app / Add to Home screen.</p>
      <small>Local 192.168.x.x testing is for development. Use the deployed HTTPS address for the field-installed app.</small>
      <button className="text-button" onClick={() => setShowHelp(false)}>Close</button>
    </div>}
  </div>
}
